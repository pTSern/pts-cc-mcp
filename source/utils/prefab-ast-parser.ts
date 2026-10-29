import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
 * pointer resolution, non-destructive mutations, and direct disk persistence.
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

    public getFilePath(): string {
        return this.filePath;
    }

    public getItem(id: number): any {
        return this.raw[id];
    }

    public isScene(): boolean {
        return Boolean(this.raw[0] && (this.raw[0].__type__ === 'cc.SceneAsset' || this.raw[0].scene));
    }

    public isPrefab(): boolean {
        return Boolean(this.raw[0] && (this.raw[0].__type__ === 'cc.Prefab' || this.raw[0].data));
    }

    public getRootNode(): AstNodeItem | null {
        // In CC 3.8 prefabs: root is usually referenced by raw[0].data.__id__ (usually index 1, cc.Node)
        // In CC 3.8 scenes: root container is referenced by raw[0].scene.__id__ (usually index 1, cc.Scene)
        let rootId = 1;
        if (this.raw[0]?.data && typeof this.raw[0].data.__id__ === 'number') {
            rootId = this.raw[0].data.__id__;
        } else if (this.raw[0]?.scene && typeof this.raw[0].scene.__id__ === 'number') {
            rootId = this.raw[0].scene.__id__;
        }

        const node = this.raw[rootId];
        if (node && (node.__type__ === 'cc.Node' || node.__type__ === 'cc.Scene')) {
            const isSceneRoot = node.__type__ === 'cc.Scene';
            return {
                id: rootId,
                node,
                name: node._name || (isSceneRoot ? 'Scene' : ''),
                path: isSceneRoot ? '' : (node._name || '')
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
                    if (childNode && (childNode.__type__ === 'cc.Node' || childNode.__type__ === 'cc.Scene')) {
                        const childName = childNode._name || `node_${childRef.__id__}`;
                        const subPath = currentPath ? `${currentPath}/${childName}` : childName;
                        traverse(childRef.__id__, subPath);
                    }
                }
            }
        };

        if (root.node.__type__ === 'cc.Scene') {
            this.nodePathMap.set(root.id, 'Scene');
            if (Array.isArray(root.node._children)) {
                for (const childRef of root.node._children) {
                    if (childRef && typeof childRef.__id__ === 'number') {
                        const childNode = this.raw[childRef.__id__];
                        if (childNode && childNode.__type__ === 'cc.Node') {
                            const childName = childNode._name || `node_${childRef.__id__}`;
                            traverse(childRef.__id__, childName);
                        }
                    }
                }
            }
        } else {
            traverse(root.id, root.name);
        }
    }

    public getAllNodes(): AstNodeItem[] {
        const result: AstNodeItem[] = [];
        for (let i = 0; i < this.raw.length; i++) {
            const item = this.raw[i];
            if (item && (item.__type__ === 'cc.Node' || item.__type__ === 'cc.Scene')) {
                const nodePath = this.nodePathMap.get(i) || item._name || '';
                result.push({
                    id: i,
                    node: item,
                    name: item._name || (item.__type__ === 'cc.Scene' ? 'Scene' : ''),
                    path: nodePath
                });
            }
        }
        return result;
    }

    public findNodeByPath(searchPath: string): AstNodeItem | null {
        if (!searchPath || searchPath === 'root' || searchPath === 'Scene' || searchPath === '.') {
            return this.getRootNode();
        }
        const normalized = searchPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

        // 1. Direct path match
        for (const [id, fullPath] of this.nodePathMap.entries()) {
            if (
                fullPath === normalized ||
                fullPath.endsWith('/' + normalized) ||
                ('Scene/' + fullPath) === normalized
            ) {
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
            if (
                item &&
                (item.__type__ === 'cc.Node' || item.__type__ === 'cc.Scene') &&
                item._name &&
                item._name.toLowerCase() === lowerName
            ) {
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

    /**
     * Resolves node by AST id, numeric string, UUID, or hierarchy path.
     */
    public resolveNode(nodeSelector: string | number | undefined | null): AstNodeItem | null {
        if (nodeSelector === undefined || nodeSelector === null || nodeSelector === '') {
            return this.getRootNode();
        }
        if (typeof nodeSelector === 'number') {
            const item = this.raw[nodeSelector];
            if (item && (item.__type__ === 'cc.Node' || item.__type__ === 'cc.Scene')) {
                return {
                    id: nodeSelector,
                    node: item,
                    name: item._name || '',
                    path: this.nodePathMap.get(nodeSelector) || item._name || ''
                };
            }
            return null;
        }

        // Numeric string? (e.g. "12")
        if (/^\d+$/.test(nodeSelector)) {
            const id = parseInt(nodeSelector, 10);
            const item = this.raw[id];
            if (item && (item.__type__ === 'cc.Node' || item.__type__ === 'cc.Scene')) {
                return {
                    id,
                    node: item,
                    name: item._name || '',
                    path: this.nodePathMap.get(id) || item._name || ''
                };
            }
        }

        // UUID string? (36 chars with hyphens)
        if (nodeSelector.length === 36 && nodeSelector.includes('-')) {
            for (let i = 0; i < this.raw.length; i++) {
                const item = this.raw[i];
                if (item && (item.__type__ === 'cc.Node' || item.__type__ === 'cc.Scene') && item._id === nodeSelector) {
                    return {
                        id: i,
                        node: item,
                        name: item._name || '',
                        path: this.nodePathMap.get(i) || item._name || ''
                    };
                }
            }
        }

        return this.findNodeByPath(nodeSelector);
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

        if (target.__type__ === 'cc.Node' || target.__type__ === 'cc.Scene') {
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

    // ==========================================
    // AST MUTATION PRIMITIVES (HEADLESS EDITING)
    // ==========================================

    /**
     * Create a new Node in the serialized AST hierarchy.
     */
    public createNode(
        parentNodeSelector: string | number | undefined | null,
        options: {
            name: string;
            position?: { x?: number; y?: number; z?: number };
            rotation?: { x?: number; y?: number; z?: number; w?: number };
            scale?: { x?: number; y?: number; z?: number };
            layer?: number;
            active?: boolean;
            is2D?: boolean;
            size?: { width?: number; height?: number };
            anchor?: { x?: number; y?: number };
        }
    ): AstNodeItem {
        const parentNode = this.resolveNode(parentNodeSelector) || this.getRootNode();
        if (!parentNode) {
            throw new Error(`Cannot resolve parent node "${parentNodeSelector}" for createNode`);
        }

        const is2D = options.is2D !== false;
        const layer = options.layer ?? (is2D ? 33554432 : 1073741824); // 33554432 = UI_2D, 1073741824 = DEFAULT
        const newNodeId = this.raw.length;
        const nodeUuid = uuidv4();

        const nodeObj: any = {
            __type__: 'cc.Node',
            _name: options.name || `Node_${newNodeId}`,
            _objFlags: 0,
            __editorExtras__: {},
            _parent: { __id__: parentNode.id },
            _children: [],
            _active: options.active !== false,
            _components: [],
            _prefab: null,
            _lpos: {
                __type__: 'cc.Vec3',
                x: options.position?.x ?? 0,
                y: options.position?.y ?? 0,
                z: options.position?.z ?? 0
            },
            _lrot: {
                __type__: 'cc.Quat',
                x: options.rotation?.x ?? 0,
                y: options.rotation?.y ?? 0,
                z: options.rotation?.z ?? 0,
                w: options.rotation?.w ?? 1
            },
            _lscale: {
                __type__: 'cc.Vec3',
                x: options.scale?.x ?? 1,
                y: options.scale?.y ?? 1,
                z: options.scale?.z ?? 1
            },
            _mobility: 0,
            _layer: layer,
            _euler: {
                __type__: 'cc.Vec3',
                x: 0,
                y: 0,
                z: 0
            },
            _id: nodeUuid
        };

        this.raw.push(nodeObj);

        // Link into parent _children
        parentNode.node._children = parentNode.node._children || [];
        parentNode.node._children.push({ __id__: newNodeId });

        // If 2D element, attach cc.UITransform automatically
        if (is2D) {
            const uiTransformId = this.raw.length;
            const uiTransformObj: any = {
                __type__: 'cc.UITransform',
                _name: '',
                _objFlags: 0,
                __editorExtras__: {},
                node: { __id__: newNodeId },
                _enabled: true,
                __prefab: null,
                _contentSize: {
                    __type__: 'cc.Size',
                    width: options.size?.width ?? 100,
                    height: options.size?.height ?? 100
                },
                _anchorPoint: {
                    __type__: 'cc.Vec2',
                    x: options.anchor?.x ?? 0.5,
                    y: options.anchor?.y ?? 0.5
                },
                _id: ''
            };
            this.raw.push(uiTransformObj);
            nodeObj._components.push({ __id__: uiTransformId });
        }

        this.buildHierarchyIndex();
        return {
            id: newNodeId,
            node: nodeObj,
            name: nodeObj._name,
            path: this.nodePathMap.get(newNodeId) || nodeObj._name
        };
    }

    /**
     * Delete a node and its attached entities from the serialized AST.
     */
    public deleteNode(nodeSelector: string | number): { success: boolean; message: string } {
        const target = this.resolveNode(nodeSelector);
        if (!target) {
            return { success: false, message: `Node "${nodeSelector}" not found` };
        }
        const root = this.getRootNode();
        if (target.id === root?.id) {
            return { success: false, message: 'Cannot delete root node/scene' };
        }

        // Unlink from parent
        const parentId = target.node._parent?.__id__;
        if (parentId !== undefined && this.raw[parentId]) {
            const parent = this.raw[parentId];
            if (Array.isArray(parent._children)) {
                parent._children = parent._children.filter((ref: any) => ref?.__id__ !== target.id);
            }
        }

        // Collect descendant IDs to null out
        const idsToRemove = new Set<number>();
        const collectDescendants = (id: number) => {
            idsToRemove.add(id);
            const n = this.raw[id];
            if (!n) return;
            if (Array.isArray(n._components)) {
                for (const c of n._components) {
                    if (c && typeof c.__id__ === 'number') idsToRemove.add(c.__id__);
                }
            }
            if (Array.isArray(n._children)) {
                for (const ch of n._children) {
                    if (ch && typeof ch.__id__ === 'number') collectDescendants(ch.__id__);
                }
            }
        };

        collectDescendants(target.id);
        for (const id of idsToRemove) {
            this.raw[id] = null;
        }

        this.buildHierarchyIndex();
        return { success: true, message: `Deleted node "${target.name}" and ${idsToRemove.size - 1} attached entities` };
    }

    /**
     * Reparent a node to a new parent node.
     */
    public reparentNode(
        nodeSelector: string | number,
        newParentSelector: string | number
    ): { success: boolean; message: string } {
        const target = this.resolveNode(nodeSelector);
        if (!target) {
            return { success: false, message: `Node "${nodeSelector}" not found` };
        }
        const newParent = this.resolveNode(newParentSelector);
        if (!newParent) {
            return { success: false, message: `New parent node "${newParentSelector}" not found` };
        }
        if (target.id === newParent.id) {
            return { success: false, message: 'Cannot reparent node to itself' };
        }

        // Unlink from old parent
        const oldParentId = target.node._parent?.__id__;
        if (oldParentId !== undefined && this.raw[oldParentId]) {
            const oldParent = this.raw[oldParentId];
            if (Array.isArray(oldParent._children)) {
                oldParent._children = oldParent._children.filter((ref: any) => ref?.__id__ !== target.id);
            }
        }

        // Link to new parent
        target.node._parent = { __id__: newParent.id };
        newParent.node._children = newParent.node._children || [];
        newParent.node._children.push({ __id__: target.id });

        this.buildHierarchyIndex();
        return {
            success: true,
            message: `Reparented node "${target.name}" under "${newParent.name}"`
        };
    }

    /**
     * Add a component to target node in serialized AST.
     * Automatically resolves custom script class names to compressed CIDs via ScriptMetaRegistry.
     */
    public addComponent(
        nodeSelector: string | number,
        componentType: string,
        properties: Record<string, any> = {}
    ): { success: boolean; message: string; componentId?: number; componentType?: string } {
        const target = this.resolveNode(nodeSelector);
        if (!target) {
            return { success: false, message: `Node "${nodeSelector}" not found` };
        }

        // Resolve component type
        const resolved = this.metaRegistry.resolveType(componentType);
        const typeToAssign = resolved.type || componentType;

        const newCompId = this.raw.length;
        const compObj: any = {
            __type__: typeToAssign,
            _name: '',
            _objFlags: 0,
            __editorExtras__: {},
            node: { __id__: target.id },
            _enabled: true,
            _id: ''
        };

        // Builtin sensible defaults
        if (typeToAssign === 'cc.Sprite') {
            compObj._customMaterial = null;
            compObj._srcBlendFactor = 2;
            compObj._dstBlendFactor = 4;
            compObj._color = { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 };
            compObj._spriteFrame = null;
            compObj._type = 0;
            compObj._sizeMode = 1;
        } else if (typeToAssign === 'cc.Label') {
            compObj._customMaterial = null;
            compObj._color = { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 };
            compObj._string = properties.string || properties._string || 'Label';
            compObj._fontSize = properties.fontSize || properties._fontSize || 24;
            compObj._lineHeight = properties.lineHeight || properties._lineHeight || 30;
        } else if (typeToAssign === 'cc.RigidBody2D') {
            compObj._type = 2; // Dynamic
            compObj.enabledContactListener = true;
            compObj._gravityScale = 1;
        }

        this.raw.push(compObj);
        target.node._components = target.node._components || [];
        target.node._components.push({ __id__: newCompId });

        // Apply initial properties
        if (properties && typeof properties === 'object') {
            for (const [propName, propVal] of Object.entries(properties)) {
                this.setComponentProperty(target.id, typeToAssign, propName, propVal);
            }
        }

        return {
            success: true,
            message: `Added component "${resolved.className || typeToAssign}" to node "${target.name}" (id: ${newCompId})`,
            componentId: newCompId,
            componentType: resolved.className || typeToAssign
        };
    }

    /**
     * Remove component from target node in serialized AST.
     */
    public removeComponent(
        nodeSelector: string | number,
        componentTypeOrIndex: string | number
    ): { success: boolean; message: string } {
        const target = this.resolveNode(nodeSelector);
        if (!target) {
            return { success: false, message: `Node "${nodeSelector}" not found` };
        }

        const components = this.getComponents(target.id);
        if (components.length === 0) {
            return { success: false, message: `Node "${target.name}" has no components` };
        }

        let targetComp: AstComponentItem | null = null;
        if (typeof componentTypeOrIndex === 'number') {
            if (componentTypeOrIndex >= 0 && componentTypeOrIndex < components.length) {
                targetComp = components[componentTypeOrIndex];
            } else {
                targetComp = components.find(c => c.id === componentTypeOrIndex) || null;
            }
        } else {
            targetComp = this.findComponent(target.id, componentTypeOrIndex);
        }

        if (!targetComp) {
            return { success: false, message: `Component "${componentTypeOrIndex}" not found on node "${target.name}"` };
        }

        target.node._components = target.node._components.filter((ref: any) => ref?.__id__ !== targetComp!.id);
        this.raw[targetComp.id] = null;

        return {
            success: true,
            message: `Removed component "${targetComp.className || targetComp.type}" from node "${target.name}"`
        };
    }

    public setTransform(
        nodeSelector: string | number,
        transform: {
            position?: { x?: number; y?: number; z?: number };
            rotation?: { x?: number; y?: number; z?: number; w?: number };
            scale?: { x?: number; y?: number; z?: number };
            size?: { width?: number; height?: number };
            anchor?: { x?: number; y?: number };
        }
    ): boolean {
        const target = this.resolveNode(nodeSelector);
        if (!target || !target.node) return false;
        const node = target.node;

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

        // Content size / anchor point updates on cc.UITransform
        if (transform.size || transform.anchor) {
            const uiTrans = this.findComponent(target.id, 'cc.UITransform');
            if (uiTrans) {
                if (transform.size) {
                    uiTrans.comp._contentSize = uiTrans.comp._contentSize || { __type__: 'cc.Size', width: 0, height: 0 };
                    if (transform.size.width !== undefined) uiTrans.comp._contentSize.width = transform.size.width;
                    if (transform.size.height !== undefined) uiTrans.comp._contentSize.height = transform.size.height;
                }
                if (transform.anchor) {
                    uiTrans.comp._anchorPoint = uiTrans.comp._anchorPoint || { __type__: 'cc.Vec2', x: 0.5, y: 0.5 };
                    if (transform.anchor.x !== undefined) uiTrans.comp._anchorPoint.x = transform.anchor.x;
                    if (transform.anchor.y !== undefined) uiTrans.comp._anchorPoint.y = transform.anchor.y;
                }
            }
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

        // Support dot notation (e.g. "contentSize.width")
        if (property.includes('.')) {
            const parts = property.split('.');
            let curr = comp;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                const key = (part in curr) ? part : (('_' + part) in curr ? ('_' + part) : part);
                if (!curr[key] || typeof curr[key] !== 'object') {
                    curr[key] = {};
                }
                curr = curr[key];
            }
            const lastPart = parts[parts.length - 1];
            const finalKey = (lastPart in curr) ? lastPart : (('_' + lastPart) in curr ? ('_' + lastPart) : lastPart);
            curr[finalKey] = value;
            return {
                success: true,
                message: `Updated nested property "${property}" on component ${compItem.className || compItem.type}`
            };
        }

        // Field match (with or without leading underscore)
        const targetKey = (property in comp)
            ? property
            : (('_' + property) in comp ? ('_' + property) : property);

        // Convert asset references
        if (
            typeof value === 'string' &&
            (targetKey.includes('spriteFrame') || targetKey.includes('texture') || targetKey.includes('material') || targetKey.includes('skeletonData') || targetKey.includes('font'))
        ) {
            if (/^[0-9a-f-]{36}$/i.test(value)) {
                comp[targetKey] = { __uuid__: value };
                return { success: true, message: `Set asset reference on ${targetKey}` };
            }
        }

        comp[targetKey] = value;
        return {
            success: true,
            message: `Updated property "${property}" on component ${compItem.className || compItem.type}`
        };
    }

    public updateComponentProperties(
        nodeSelector: string | number,
        componentType: string,
        properties: Record<string, any>
    ): { success: boolean; message: string; updatedCount: number } {
        const target = this.resolveNode(nodeSelector);
        if (!target) {
            return { success: false, message: `Node "${nodeSelector}" not found`, updatedCount: 0 };
        }

        let updatedCount = 0;
        for (const [propName, propVal] of Object.entries(properties)) {
            const res = this.setComponentProperty(target.id, componentType, propName, propVal);
            if (res.success) updatedCount++;
        }

        return {
            success: true,
            message: `Updated ${updatedCount} properties on component "${componentType}" of node "${target.name}"`,
            updatedCount
        };
    }

    public getHierarchyTree(includeComponents: boolean = true): any {
        const root = this.getRootNode();
        if (!root) return null;

        const buildNodeTree = (id: number): any => {
            const item = this.raw[id];
            if (!item) return null;
            const nodeName = item._name || (item.__type__ === 'cc.Scene' ? 'Scene' : `Node_${id}`);
            const nodePath = this.nodePathMap.get(id) || nodeName;

            const res: any = {
                id,
                name: nodeName,
                path: nodePath,
                type: item.__type__,
                active: item._active !== false,
                position: item._lpos ? { x: item._lpos.x, y: item._lpos.y, z: item._lpos.z } : undefined
            };

            if (includeComponents && Array.isArray(item._components)) {
                res.components = this.getComponents(id).map(c => ({
                    id: c.id,
                    type: c.type,
                    className: c.className || c.type
                }));
            }

            if (Array.isArray(item._children) && item._children.length > 0) {
                res.children = [];
                for (const ch of item._children) {
                    if (ch && typeof ch.__id__ === 'number') {
                        const childTree = buildNodeTree(ch.__id__);
                        if (childTree) res.children.push(childTree);
                    }
                }
            }

            return res;
        };

        return buildNodeTree(root.id);
    }

    public async save(targetPath?: string): Promise<void> {
        const dest = targetPath || this.filePath;
        if (!dest) throw new Error('No destination file path specified for saving file');
        const formatted = JSON.stringify(this.raw, null, 2);
        await fs.promises.writeFile(dest, formatted, 'utf8');
    }

    public saveSync(targetPath?: string): void {
        const dest = targetPath || this.filePath;
        if (!dest) throw new Error('No destination file path specified for saving file');
        const formatted = JSON.stringify(this.raw, null, 2);
        fs.writeFileSync(dest, formatted, 'utf8');
    }
}

export { PrefabAstParser as CocosAstParser };
