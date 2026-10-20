import * as fs from 'fs';
import * as path from 'path';
import { ScriptMetaRegistry } from './uuid-utils';

export interface AstNodeItem {
    id: number;
    node: any;
    name: string;
    path: string;
}

export interface AstComponentItem {
    id: number;
    comp: any;
    type: string;
    className?: string;
}

export interface ResolvedTargetPointer {
    id: number;
    kind: 'node' | 'component' | 'asset' | 'unknown';
    name?: string;
    type?: string;
    description: string;
}

/**
 * Headless AST parser for Cocos Creator 3.8.x serialized .prefab and .scene JSON files.
 * Provides array index navigation, subpath traversal, component extraction,
 * pointer resolution, and non-destructive mutations.
 */
export class PrefabAstParser {
    private raw: any[];
    private filePath: string = '';
    private nodePathMap: Map<number, string> = new Map();
    private metaRegistry: ScriptMetaRegistry = ScriptMetaRegistry.getInstance();

    constructor(data: any[] | string, filePath: string = '') {
        this.filePath = filePath;
        if (typeof data === 'string') {
            this.raw = JSON.parse(data);
        } else {
            this.raw = data;
        }
        this.buildHierarchyIndex();
    }

    public static async loadFromFile(filePath: string): Promise<PrefabAstParser> {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const raw = JSON.parse(content);
        return new PrefabAstParser(raw, filePath);
    }

    public static loadFromFileSync(filePath: string): PrefabAstParser {
        const content = fs.readFileSync(filePath, 'utf8');
        const raw = JSON.parse(content);
        return new PrefabAstParser(raw, filePath);
    }

    public getRawData(): any[] {
        return this.raw;
    }

    public getItem(id: number): any {
        return this.raw[id];
    }

    public getRootNode(): AstNodeItem | null {
        // In CC 3.8 prefabs, root node is usually index 1, or referenced by index 0.data.__id__
        let rootId = 1;
        if (this.raw[0] && this.raw[0].data && typeof this.raw[0].data.__id__ === 'number') {
            rootId = this.raw[0].data.__id__;
        }
        const node = this.raw[rootId];
        if (node && node.__type__ === 'cc.Node') {
            return {
                id: rootId,
                node,
                name: node._name || '',
                path: node._name || ''
            };
        }
        return null;
    }

    private buildHierarchyIndex(): void {
        this.nodePathMap.clear();
        const root = this.getRootNode();
        if (!root) return;

        const traverse = (nodeId: number, currentPath: string) => {
            this.nodePathMap.set(nodeId, currentPath);
            const node = this.raw[nodeId];
            if (!node || !Array.isArray(node._children)) return;

            for (const childRef of node._children) {
                if (childRef && typeof childRef.__id__ === 'number') {
                    const childNode = this.raw[childRef.__id__];
                    if (childNode && childNode.__type__ === 'cc.Node') {
                        const childName = childNode._name || `node_${childRef.__id__}`;
                        const subPath = currentPath ? `${currentPath}/${childName}` : childName;
                        traverse(childRef.__id__, subPath);
                    }
                }
            }
        };

        traverse(root.id, root.name);
    }

    public getAllNodes(): AstNodeItem[] {
        const result: AstNodeItem[] = [];
        for (let i = 0; i < this.raw.length; i++) {
            const item = this.raw[i];
            if (item && item.__type__ === 'cc.Node') {
                const nodePath = this.nodePathMap.get(i) || item._name || '';
                result.push({
                    id: i,
                    node: item,
                    name: item._name || '',
                    path: nodePath
                });
            }
        }
        return result;
    }

    public findNodeByPath(searchPath: string): AstNodeItem | null {
        if (!searchPath) return this.getRootNode();
        const normalized = searchPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

        // 1. Direct path lookup
        for (const [id, fullPath] of this.nodePathMap.entries()) {
            if (fullPath === normalized || fullPath.endsWith('/' + normalized)) {
                return {
                    id,
                    node: this.raw[id],
                    name: this.raw[id]._name || '',
                    path: fullPath
                };
            }
        }

        // 2. Single name match
        return this.findNodeByName(normalized);
    }

    public findNodeByName(name: string): AstNodeItem | null {
        const lowerName = name.toLowerCase();
        for (let i = 0; i < this.raw.length; i++) {
            const item = this.raw[i];
            if (item && item.__type__ === 'cc.Node' && item._name && item._name.toLowerCase() === lowerName) {
                return {
                    id: i,
                    node: item,
                    name: item._name,
                    path: this.nodePathMap.get(i) || item._name
                };
            }
        }
        return null;
    }

    public getComponents(nodeId: number): AstComponentItem[] {
        const node = this.raw[nodeId];
        if (!node || !Array.isArray(node._components)) return [];

        const components: AstComponentItem[] = [];
        for (const compRef of node._components) {
            if (compRef && typeof compRef.__id__ === 'number') {
                const comp = this.raw[compRef.__id__];
                if (comp && comp.__type__) {
                    const resolved = this.metaRegistry.resolveType(comp.__type__);
                    components.push({
                        id: compRef.__id__,
                        comp,
                        type: comp.__type__,
                        className: resolved.className
                    });
                }
            }
        }
        return components;
    }

    public findComponent(nodeId: number, typeOrClassName: string): AstComponentItem | null {
        const components = this.getComponents(nodeId);
        const search = typeOrClassName.toLowerCase();

        for (const item of components) {
            if (item.type.toLowerCase() === search) return item;
            if (item.className && item.className.toLowerCase() === search) return item;
            if (item.className && item.className.replace(/\./g, '_').toLowerCase() === search) return item;
            if (item.type.includes(typeOrClassName)) return item;
        }
        return null;
    }

    public resolvePointer(id: number): ResolvedTargetPointer {
        if (id < 0 || id >= this.raw.length) {
            return { id, kind: 'unknown', description: `Invalid Pointer (${id})` };
        }
        const target = this.raw[id];
        if (!target) {
            return { id, kind: 'unknown', description: `Null Pointer (${id})` };
        }

        if (target.__type__ === 'cc.Node') {
            const nodePath = this.nodePathMap.get(id) || target._name || '';
            return {
                id,
                kind: 'node',
                name: target._name,
                description: `Node (${nodePath || target._name || id})`
            };
        }

        if (target.__type__ && (target.__type__.startsWith('cc.') || target.__type__.length === 22 || target.__type__.length === 23)) {
            const resolved = this.metaRegistry.resolveType(target.__type__);
            const compName = resolved.className || target.__type__;
            return {
                id,
                kind: 'component',
                name: compName,
                type: target.__type__,
                description: `Component <${compName}> (id: ${id})`
            };
        }

        if (target.__type__ === 'cc.Prefab') {
            return {
                id,
                kind: 'asset',
                name: target._name,
                description: `Prefab Asset (${target._name || id})`
            };
        }

        return {
            id,
            kind: 'unknown',
            type: target.__type__,
            description: `${target.__type__ || 'Object'} (id: ${id})`
        };
    }

    public resolveValueWithPointers(val: any, depth: number = 0): any {
        if (depth > 5) return val;
        if (val === null || val === undefined) return val;

        if (typeof val === 'object') {
            if (typeof val.__id__ === 'number') {
                const ptr = this.resolvePointer(val.__id__);
                return {
                    id: val.__id__,
                    resolvedTarget: ptr.description,
                    targetKind: ptr.kind,
                    targetName: ptr.name
                };
            }
            if (typeof val.__uuid__ === 'string') {
                return val.__uuid__;
            }
            if (Array.isArray(val)) {
                return val.map(item => this.resolveValueWithPointers(item, depth + 1));
            }
            const copy: Record<string, any> = {};
            for (const [k, v] of Object.entries(val)) {
                if (k === '__prefab' || k === 'fileId' || k === '_id') continue;
                copy[k] = this.resolveValueWithPointers(v, depth + 1);
            }
            return copy;
        }

        return val;
    }

    public setTransform(nodeId: number, transform: {
        position?: { x?: number; y?: number; z?: number };
        rotation?: { x?: number; y?: number; z?: number; w?: number };
        scale?: { x?: number; y?: number; z?: number };
    }): boolean {
        const node = this.raw[nodeId];
        if (!node || node.__type__ !== 'cc.Node') return false;

        if (transform.position) {
            node._lpos = node._lpos || { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 };
            if (transform.position.x !== undefined) node._lpos.x = transform.position.x;
            if (transform.position.y !== undefined) node._lpos.y = transform.position.y;
            if (transform.position.z !== undefined) node._lpos.z = transform.position.z;
        }

        if (transform.scale) {
            node._lscale = node._lscale || { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 };
            if (transform.scale.x !== undefined) node._lscale.x = transform.scale.x;
            if (transform.scale.y !== undefined) node._lscale.y = transform.scale.y;
            if (transform.scale.z !== undefined) node._lscale.z = transform.scale.z;
        }

        if (transform.rotation) {
            node._lrot = node._lrot || { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 };
            if (transform.rotation.x !== undefined) node._lrot.x = transform.rotation.x;
            if (transform.rotation.y !== undefined) node._lrot.y = transform.rotation.y;
            if (transform.rotation.z !== undefined) node._lrot.z = transform.rotation.z;
            if (transform.rotation.w !== undefined) node._lrot.w = transform.rotation.w;
        }

        return true;
    }

    public setComponentProperty(
        nodeId: number,
        componentType: string,
        property: string,
        value: any,
        options?: { valueMode?: 'self_node' }
    ): { success: boolean; message: string } {
        const compItem = this.findComponent(nodeId, componentType);
        if (!compItem) {
            return {
                success: false,
                message: `Component "${componentType}" not found on node id ${nodeId}`
            };
        }

        const comp = compItem.comp;
        if (options?.valueMode === 'self_node') {
            // Assign pointer to node itself: [ { __id__: nodeId } ] or { __id__: nodeId }
            if (Array.isArray(comp[property])) {
                comp[property] = [{ __id__: nodeId }];
            } else {
                comp[property] = { __id__: nodeId };
            }
            return {
                success: true,
                message: `Set ${property} to self node pointer (__id__: ${nodeId})`
            };
        }

        comp[property] = value;
        return {
            success: true,
            message: `Updated property "${property}" on component ${compItem.className || compItem.type}`
        };
    }

    public async save(targetPath?: string): Promise<void> {
        const dest = targetPath || this.filePath;
        if (!dest) throw new Error('No destination file path specified for saving prefab');
        const formatted = JSON.stringify(this.raw, null, 2);
        await fs.promises.writeFile(dest, formatted, 'utf8');
    }

    public saveSync(targetPath?: string): void {
        const dest = targetPath || this.filePath;
        if (!dest) throw new Error('No destination file path specified for saving prefab');
        const formatted = JSON.stringify(this.raw, null, 2);
        fs.writeFileSync(dest, formatted, 'utf8');
    }
}
