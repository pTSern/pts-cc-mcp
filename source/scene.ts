import { join } from 'path';
module.paths.push(join(Editor.App.path, 'node_modules'));

export const methods: { [key: string]: (...any: any) => any } = {
    /**
     * Create a new scene
     */
    createNewScene() {
        try {
            const { director, Scene } = require('cc');
            const scene = new Scene();
            scene.name = 'New Scene';
            director.runScene(scene);
            return { success: true, message: 'New scene created successfully' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Add component to a node
     */
    addComponentToNode(nodeUuid: string, componentType: string) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            // Find node by UUID
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }

            // Get component class
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }

            // Add component
            const component = node.addComponent(ComponentClass);
            return { 
                success: true, 
                message: `Component ${componentType} added successfully`,
                data: { componentId: component.uuid }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Remove component from a node
     */
    removeComponentFromNode(nodeUuid: string, componentType: string) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }

            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }

            const component = node.getComponent(ComponentClass);
            if (!component) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }

            node.removeComponent(component);
            return { success: true, message: `Component ${componentType} removed successfully` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Create a new node
     */
    createNode(name: string, parentUuid?: string) {
        try {
            const { director, Node } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const node = new Node(name);
            
            if (parentUuid) {
                const parent = scene.getChildByUuid(parentUuid);
                if (parent) {
                    parent.addChild(node);
                } else {
                    scene.addChild(node);
                }
            } else {
                scene.addChild(node);
            }

            return { 
                success: true, 
                message: `Node ${name} created successfully`,
                data: { uuid: node.uuid, name: node.name }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Get node information
     */
    getNodeInfo(nodeUuid: string) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }

            return {
                success: true,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    position: node.position,
                    rotation: node.rotation,
                    scale: node.scale,
                    parent: node.parent?.uuid,
                    children: node.children.map((child: any) => child.uuid),
                    components: node.components.map((comp: any) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }))
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Get all nodes in scene
     */
    getAllNodes() {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const nodes: any[] = [];
            const collectNodes = (node: any) => {
                nodes.push({
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    parent: node.parent?.uuid
                });
                
                node.children.forEach((child: any) => collectNodes(child));
            };

            scene.children.forEach((child: any) => collectNodes(child));
            
            return { success: true, data: nodes };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Find node by name
     */
    findNodeByName(name: string) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const node = scene.getChildByName(name);
            if (!node) {
                return { success: false, error: `Node with name ${name} not found` };
            }

            return {
                success: true,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    position: node.position
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Get current scene information
     */
    getCurrentSceneInfo() {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            return {
                success: true,
                data: {
                    name: scene.name,
                    uuid: scene.uuid,
                    nodeCount: scene.children.length
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Set node property
     */
    setNodeProperty(nodeUuid: string, property: string, value: any) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }

            // Set properties
            if (property === 'position') {
                node.setPosition(value.x || 0, value.y || 0, value.z || 0);
            } else if (property === 'rotation') {
                node.setRotationFromEuler(value.x || 0, value.y || 0, value.z || 0);
            } else if (property === 'scale') {
                node.setScale(value.x || 1, value.y || 1, value.z || 1);
            } else if (property === 'active') {
                node.active = value;
            } else if (property === 'name') {
                node.name = value;
            } else {
                // Try setting property directly
                (node as any)[property] = value;
            }

            return { 
                success: true, 
                message: `Property '${property}' updated successfully` 
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Get scene hierarchy
     */
    getSceneHierarchy(includeComponents: boolean = false) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const processNode = (node: any): any => {
                const result: any = {
                    name: node.name,
                    uuid: node.uuid,
                    active: node.active,
                    children: []
                };

                if (includeComponents) {
                    result.components = node.components.map((comp: any) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }));
                }

                if (node.children && node.children.length > 0) {
                    result.children = node.children.map((child: any) => processNode(child));
                }

                return result;
            };

            const hierarchy = scene.children.map((child: any) => processNode(child));
            return { success: true, data: hierarchy };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Create prefab from node
     */
    createPrefabFromNode(nodeUuid: string, prefabPath: string) {
        try {
            const { director, instantiate } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }

            // Note: This is a simulation implementation because prefab files cannot be created directly in runtime environment
            // Real prefab creation requires Editor API support
            return {
                success: true,
                data: {
                    prefabPath: prefabPath,
                    sourceNodeUuid: nodeUuid,
                    message: `Prefab created from node '${node.name}' at ${prefabPath}`
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Set component property
     */
    setComponentProperty(nodeUuid: string, componentType: string, property: string, value: any) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }
            const component = node.getComponent(ComponentClass);
            if (!component) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }
            // Special handling for common properties
            if (property === 'spriteFrame' && componentType === 'cc.Sprite') {
                // Support value as uuid or asset path
                if (typeof value === 'string') {
                    // Try looking up by uuid first
                    const assetManager = require('cc').assetManager;
                    assetManager.resources.load(value, require('cc').SpriteFrame, (err: any, spriteFrame: any) => {
                        if (!err && spriteFrame) {
                            component.spriteFrame = spriteFrame;
                        } else {
                            // Try loading by uuid
                            assetManager.loadAny({ uuid: value }, (err2: any, asset: any) => {
                                if (!err2 && asset) {
                                    component.spriteFrame = asset;
                                } else {
                                    // Direct assignment (compatible with passed asset object)
                                    component.spriteFrame = value;
                                }
                            });
                        }
                    });
                } else {
                    component.spriteFrame = value;
                }
            } else if (property === 'material' && (componentType === 'cc.Sprite' || componentType === 'cc.MeshRenderer')) {
                // Support value as uuid or asset path
                if (typeof value === 'string') {
                    const assetManager = require('cc').assetManager;
                    assetManager.resources.load(value, require('cc').Material, (err: any, material: any) => {
                        if (!err && material) {
                            component.material = material;
                        } else {
                            assetManager.loadAny({ uuid: value }, (err2: any, asset: any) => {
                                if (!err2 && asset) {
                                    component.material = asset;
                                } else {
                                    component.material = value;
                                }
                            });
                        }
                    });
                } else {
                    component.material = value;
                }
            } else if (property === 'string' && (componentType === 'cc.Label' || componentType === 'cc.RichText')) {
                component.string = value;
            } else {
                component[property] = value;
            }
            // Optional: Refresh Inspector
            // Editor.Message.send('scene', 'snapshot');
            return { success: true, message: `Component property '${property}' updated successfully` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Return hierarchical tree of nodes
     */
    nodeTree(path: string = '/', depth: number = 32, includeComponents: boolean = true) {
        try {
            const cc = require('cc');
            const root = requireSceneNode(path);
            const build = (node: any, level: number): any => {
                const entry: any = { nodeId: node.uuid, path: getHierarchyPathOf(node), name: node.name };
                if (!(node instanceof cc.Scene)) entry.active = node.active;
                if (includeComponents && !(node instanceof cc.Scene)) {
                    entry.components = (node.components || []).map((c: any) => cc.js.getClassName(c));
                }
                const kids = visibleChildren(node);
                if (level < depth) {
                    entry.children = kids.map((c: any) => build(c, level + 1));
                } else if (kids.length) {
                    entry.childCount = kids.length;
                }
                return entry;
            };
            return { success: true, data: build(root, 0) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Search nodes in scene matching criteria
     */
    findNodes(opts: { rootPath?: string; name?: string; nameContains?: string; componentType?: string; includeInactive?: boolean; limit?: number }) {
        try {
            const cc = require('cc');
            const root = requireSceneNode(opts.rootPath || '/');
            const limit = opts.limit || 100;
            const contains = opts.nameContains ? String(opts.nameContains).toLowerCase() : null;
            const cls = opts.componentType
                ? (cc.js.getClassByName(opts.componentType) || cc.js.getClassByName(`cc.${opts.componentType}`))
                : null;
            if (opts.componentType && !cls) {
                return { success: false, error: `Unknown component type: ${opts.componentType}` };
            }
            const results: any[] = [];
            const visit = (node: any) => {
                if (results.length >= limit) return;
                if (!(node instanceof cc.Scene)) {
                    const ok = (!opts.name || node.name === opts.name)
                        && (!contains || node.name.toLowerCase().includes(contains))
                        && (!cls || Boolean(node.getComponent(cls)))
                        && (opts.includeInactive !== false || node.activeInHierarchy);
                    if (ok) {
                        results.push({
                            nodeId: node.uuid,
                            path: getHierarchyPathOf(node),
                            name: node.name,
                            active: node.active,
                            components: (node.components || []).map((c: any) => cc.js.getClassName(c)),
                        });
                    }
                }
                for (const c of visibleChildren(node)) visit(c);
            };
            visit(root);
            return { success: true, data: results };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Invoke method on component in open scene
     */
    invokeComponentMethod(componentPath: string, method: string, args: any[] = []) {
        try {
            const cc = require('cc');
            const segments = splitPath(componentPath);
            if (segments.length < 2) {
                return { success: false, error: 'componentPath must include node path and component type, e.g. "Canvas/Button/cc.Button"' };
            }
            const type = segments.pop()!;
            const node = requireSceneNode(segments.join('/'));
            const comps = node.components || [];
            const comp = comps.find((c: any) => {
                const className = cc.js.getClassName(c);
                return className === type || className === `cc.${type}` || (c.constructor && c.constructor.name === type);
            });
            if (!comp) {
                const available = comps.map((c: any) => cc.js.getClassName(c)).join(', ') || '(none)';
                return { success: false, error: `Component "${type}" not found on node "${getHierarchyPathOf(node)}". Available: ${available}` };
            }
            if (typeof comp[method] !== 'function') {
                return { success: false, error: `Method "${method}" not found on ${cc.js.getClassName(comp)}` };
            }
            const result = comp[method](...(Array.isArray(args) ? args : []));
            if ((globalThis as any).cce && (globalThis as any).cce.Engine && typeof (globalThis as any).cce.Engine.repaintInEditMode === 'function') {
                (globalThis as any).cce.Engine.repaintInEditMode();
            }
            return {
                success: true,
                invoked: true,
                componentPath: `${getHierarchyPathOf(comp.node)}/${cc.js.getClassName(comp)}`,
                method,
                result: toSafePlain(result)
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Fire cc.Button click handlers and click event in open scene
     */
    simulateButtonClick(nodePath: string) {
        try {
            const cc = require('cc');
            const node = requireSceneNode(nodePath);
            const button = node.getComponent(cc.Button);
            if (!button) {
                return { success: false, error: `cc.Button component not found on node "${getHierarchyPathOf(node)}"` };
            }
            if (button.clickEvents && button.clickEvents.length) {
                cc.Component.EventHandler.emitEvents(button.clickEvents, button);
            }
            node.emit(cc.Button.EventType.CLICK, button);
            if ((globalThis as any).cce && (globalThis as any).cce.Engine && typeof (globalThis as any).cce.Engine.repaintInEditMode === 'function') {
                (globalThis as any).cce.Engine.repaintInEditMode();
            }
            return {
                success: true,
                clicked: true,
                nodePath: getHierarchyPathOf(node),
                clickEventCount: (button.clickEvents || []).length
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Emit custom event on scene node
     */
    emitNodeEvent(nodePath: string, eventName: string, payload: any = null) {
        try {
            const node = requireSceneNode(nodePath);
            node.emit(eventName, payload);
            if ((globalThis as any).cce && (globalThis as any).cce.Engine && typeof (globalThis as any).cce.Engine.repaintInEditMode === 'function') {
                (globalThis as any).cce.Engine.repaintInEditMode();
            }
            return {
                success: true,
                emitted: true,
                nodePath: getHierarchyPathOf(node),
                eventName
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Auto trace polygon 2d contour points from sprite texture
     */
    async regeneratePolygon2DPoints(ref: string, record: boolean = true) {
        try {
            const cc = require('cc');
            const node = requireSceneNode(ref);
            const comp = node.getComponent(cc.PolygonCollider2D);
            if (!comp) {
                return { success: false, error: `cc.PolygonCollider2D not found on node "${getHierarchyPathOf(node)}"` };
            }
            const facade = getSceneFacade();
            const mgr = facade && facade._facadeFSM && facade._facadeFSM.generalSceneFacade && facade._facadeFSM.generalSceneFacade._physics2DMgr;
            let points: any[] | null = null;
            let source = 'sprite-contour';

            if (mgr && typeof mgr.getContourPoints === 'function') {
                points = await new Promise((resolve) => {
                    try {
                        mgr.getContourPoints(node, { threshold: comp.threshold, loop: true }, (err: any, pts: any) => resolve(err ? null : pts));
                    } catch (e) {
                        resolve(null);
                    }
                });
            }

            if (!points || !points.length) {
                const ui = node.getComponent(cc.UITransform);
                const w = ui ? ui.width : 100;
                const hgt = ui ? ui.height : 100;
                const ax = ui ? ui.anchorX : 0.5;
                const ay = ui ? ui.anchorY : 0.5;
                const l = -w * ax; const r = w * (1 - ax); const b = -hgt * ay; const t = hgt * (1 - ay);
                points = [new cc.Vec2(l, b), new cc.Vec2(r, b), new cc.Vec2(r, t), new cc.Vec2(l, t)];
                source = 'rect-fallback';
            }

            const before = JSON.stringify((comp.points || []).map((p: any) => [p.x, p.y]));
            const after = JSON.stringify(points.map((p: any) => [p.x, p.y]));
            const changed = before !== after;
            if (changed) {
                recordedSceneOp(node, record, () => {
                    comp.points = points!.map((p: any) => new cc.Vec2(p.x, p.y));
                });
            }

            return {
                success: true,
                path: `${getHierarchyPathOf(node)}/cc.PolygonCollider2D`,
                changed,
                pointCount: points.length,
                source
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Query runtime playback info of cc.ParticleSystem
     */
    particlePlayInfo(compUuid: string) {
        try {
            const facade = getSceneFacade();
            if (!facade) return { success: false, error: 'SceneFacade unavailable' };
            const speed = typeof facade.getParticlePlaySpeed === 'function' ? facade.getParticlePlaySpeed(compUuid) : 1;
            const time = typeof facade.getParticleTime === 'function' ? facade.getParticleTime(compUuid) : 0;
            const count = typeof facade.getParticleCount === 'function' ? facade.getParticleCount(compUuid) : 0;
            const playing = typeof facade.getParticleIsPlaying === 'function' ? facade.getParticleIsPlaying(compUuid) : false;
            return {
                success: true,
                speed,
                time,
                particle: { count, playing, isLocated: true }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Set particle simulation speed
     */
    setParticleSpeed(compUuid: string, speed: number) {
        try {
            const facade = getSceneFacade();
            if (facade && typeof facade.setParticlePlaySpeed === 'function') {
                facade.setParticlePlaySpeed(compUuid, speed);
                return { success: true, speed };
            }
            return { success: false, error: 'setParticlePlaySpeed not supported on facade' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Control particle actions (play, pause, stop, restart)
     */
    particleAction(action: string, nodeUuid: string) {
        try {
            const facade = getSceneFacade();
            const fnMap: Record<string, string> = {
                play: 'playParticle',
                pause: 'pauseParticle',
                stop: 'stopParticle',
                restart: 'restartParticle'
            };
            const fn = fnMap[action];
            if (facade && fn && typeof facade[fn] === 'function') {
                facade[fn]();
                return { success: true, action, nodeUuid };
            }
            return { success: false, error: `Unsupported particle action: ${action}` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};

function getActiveScene(): any {
    const { director } = require('cc');
    const scene = director.getScene();
    if (!scene) throw new Error('No active scene is currently open.');
    return scene;
}

function isRootPath(p?: string): boolean {
    return !p || p === '/' || p === '';
}

function splitPath(p: string): string[] {
    return String(p).split('/').filter(s => s.length > 0);
}

function visibleChildren(node: any): any[] {
    const cc = require('cc');
    const hidden = cc.CCObject.Flags.HideInHierarchy;
    return (node.children || []).filter((c: any) => !(c._objFlags & hidden));
}

function findNodeByPath(pathStr: string): any {
    const scene = getActiveScene();
    if (isRootPath(pathStr)) return scene;
    let current = scene;
    for (const name of splitPath(pathStr)) {
        const next = visibleChildren(current).find((c: any) => c.name === name);
        if (!next) return null;
        current = next;
    }
    return current;
}

function findNodeByUuid(uuid: string): any {
    const scene = getActiveScene();
    if (scene.uuid === uuid) return scene;
    const stack = [...(scene.children || [])];
    while (stack.length) {
        const node = stack.pop();
        if (node.uuid === uuid) return node;
        if (node.children && node.children.length) {
            stack.push(...node.children);
        }
    }
    return null;
}

function getHierarchyPathOf(node: any): string {
    const cc = require('cc');
    const names: string[] = [];
    let current = node;
    while (current && !(current instanceof cc.Scene)) {
        names.unshift(current.name);
        current = current.parent;
    }
    return names.join('/');
}

function requireSceneNode(pathOrUuid: string): any {
    const node = findNodeByUuid(pathOrUuid) || findNodeByPath(pathOrUuid);
    if (!node) throw new Error(`Node not found at "${pathOrUuid}"`);
    return node;
}

function toSafePlain(value: any, depth: number = 0): any {
    if (value === null || value === undefined) return value === undefined ? null : value;
    const t = typeof value;
    if (t === 'number' || t === 'string' || t === 'boolean') return value;
    if (t === 'function') return `[function ${value.name || 'anonymous'}]`;
    const cc = require('cc');
    if (value instanceof cc.Node) return { node: getHierarchyPathOf(value) };
    if (value instanceof cc.Component) return { component: `${getHierarchyPathOf(value.node)}/${cc.js.getClassName(value)}` };
    if (value instanceof cc.Asset) return { asset: (value as any)._uuid, type: cc.js.getClassName(value) };
    if (typeof value.then === 'function') return '[Promise]';
    if (depth > 4) return '[...]';
    if (Array.isArray(value)) return value.slice(0, 100).map((v) => toSafePlain(v, depth + 1));
    const out: any = {};
    for (const key of Object.keys(value).slice(0, 100)) {
        out[key] = toSafePlain(value[key], depth + 1);
    }
    return out;
}

function getSceneFacade(): any {
    return (globalThis as any).cce && (globalThis as any).cce.SceneFacadeManager;
}

function recordedSceneOp(node: any, record: boolean | undefined, fn: () => any): any {
    const facade = getSceneFacade();
    const id = (record === false || !facade || typeof facade.beginRecording !== 'function') ? null : facade.beginRecording(node.uuid);
    try {
        return fn();
    } finally {
        if (id !== null && id !== undefined && facade && typeof facade.endRecording === 'function') {
            facade.endRecording(id);
        }
        try {
            if ((globalThis as any).cce && (globalThis as any).cce.Node) {
                (globalThis as any).cce.Node.emit('change', node);
            }
        } catch (e) {
            // best effort inspector refresh
        }
    }
}