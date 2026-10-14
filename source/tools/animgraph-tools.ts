import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import * as fs from 'fs';
import * as path from 'path';

declare const Editor: any;

export class AnimgraphTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'manage',
                description: 'ANIMATION GRAPH TOOLS: Inspect and modify Cocos Creator .animgraph assets. Supports inspecting state machines, states, transitions, variables, and components; adding, updating, or removing StateMachineComponents (e.g. Character_Graph_Transition); and batch replacing component class types.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['inspect', 'add_component', 'update_component', 'remove_component', 'batch_replace_types'],
                            description: 'Action: "inspect" = examine states, transitions, variables, and attached components | "add_component" = attach StateMachineComponent to a state | "update_component" = modify component properties on a state | "remove_component" = detach component from a state | "batch_replace_types" = bulk replace component class names across the graph'
                        },
                        animgraphPath: {
                            type: 'string',
                            description: 'Path to .animgraph asset (e.g. "db://assets/game/game_play/characters/boss/graph/Boss_Graph.animgraph" or relative to project).'
                        },
                        stateName: {
                            type: 'string',
                            description: 'Target state name (e.g. "Idle", "Hit", "Attack", "Run", "Stun").'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component class name (e.g. "Character_Graph_Transition", "Character_Graph_PushBack").'
                        },
                        componentIndex: {
                            type: 'number',
                            description: 'Index of component in state _components list (optional).'
                        },
                        properties: {
                            type: 'object',
                            description: 'Properties to assign to the component (e.g. { fast: { __uuid__: "...", __expectedType__: "FastSpineAsset" } }).'
                        },
                        fromType: {
                            type: 'string',
                            description: 'Original component type name for batch_replace_types (e.g. "Dog_Graph_Transition").'
                        },
                        toType: {
                            type: 'string',
                            description: 'New component type name for batch_replace_types (e.g. "Character_Graph_Transition").'
                        }
                    },
                    required: ['action', 'animgraphPath']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        const action = args?.action;
        switch (action) {
            case 'inspect':
                return await this.inspectGraph(args.animgraphPath);
            case 'add_component':
                return await this.addComponent(args.animgraphPath, args.stateName, args.componentType, args.properties);
            case 'update_component':
                return await this.updateComponent(args.animgraphPath, args.stateName, args.componentType, args.properties, args.componentIndex);
            case 'remove_component':
                return await this.removeComponent(args.animgraphPath, args.stateName, args.componentType, args.componentIndex);
            case 'batch_replace_types':
                return await this.batchReplaceTypes(args.animgraphPath, args.fromType, args.toType);
            default:
                return {
                    success: false,
                    error: `Unknown action: "${action}". Valid actions: ["inspect", "add_component", "update_component", "remove_component", "batch_replace_types"]`
                };
        }
    }

    private async resolveFsPath(assetPath: string): Promise<string | null> {
        if (!assetPath) return null;

        // 1. Try Editor.Message request to asset-db
        if (typeof Editor !== 'undefined' && Editor.Message) {
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', assetPath);
                if (info && info.file && fs.existsSync(info.file)) {
                    return info.file;
                }
            } catch {}
        }

        // 2. Relative or direct filesystem path
        if (path.isAbsolute(assetPath) && fs.existsSync(assetPath)) {
            return assetPath;
        }

        // 3. Fallback relative to project root
        const projectRoot = (typeof Editor !== 'undefined' && Editor.Project && Editor.Project.path) 
            ? Editor.Project.path 
            : process.cwd();

        let cleanPath = assetPath.replace(/^db:\/\/assets\//, 'assets/');
        cleanPath = cleanPath.replace(/^db:\/\//, '');
        const fullPath = path.resolve(projectRoot, cleanPath);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }

        return null;
    }

    private async readGraphJson(assetPath: string): Promise<{ filePath: string; data: any[] }> {
        const filePath = await this.resolveFsPath(assetPath);
        if (!filePath) {
            throw new Error(`Animation graph file not found: "${assetPath}"`);
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) {
            throw new Error(`Invalid .animgraph structure: expected JSON array in "${filePath}"`);
        }

        return { filePath, data };
    }

    private async saveGraphJson(filePath: string, assetPath: string, data: any[]): Promise<void> {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        if (typeof Editor !== 'undefined' && Editor.Message) {
            try {
                await Editor.Message.request('asset-db', 'refresh', assetPath);
            } catch (err) {
                console.warn('[AnimgraphTools] asset-db refresh warning:', err);
            }
        }
    }

    private async inspectGraph(animgraphPath: string): Promise<ToolResponse> {
        try {
            const { filePath, data } = await this.readGraphJson(animgraphPath);

            const root = data.find(el => el.__type__ === 'cc.animation.AnimationGraph') || data[0];
            const name = root?._name || path.basename(filePath, '.animgraph');

            // Variables
            const variables: Record<string, any> = {};
            if (root?._variables && typeof root._variables === 'object') {
                for (const [varName, ref] of Object.entries(root._variables)) {
                    const varId = (ref as any)?.__id__;
                    if (typeof varId === 'number' && data[varId]) {
                        variables[varName] = data[varId];
                    } else {
                        variables[varName] = ref;
                    }
                }
            }

            // State Machines
            const stateMachines = data.filter(el => el.__type__ === 'cc.animation.StateMachine');
            const parsedStateMachines: any[] = [];

            for (const sm of stateMachines) {
                const states: any[] = [];
                const stateIdToName = new Map<number, string>();

                if (Array.isArray(sm._states)) {
                    for (const stateRef of sm._states) {
                        const sId = stateRef.__id__;
                        const stateObj = data[sId];
                        if (!stateObj) continue;

                        const sName = stateObj.name || `State_${sId}`;
                        stateIdToName.set(sId, sName);

                        // Attached components
                        const components: any[] = [];
                        if (Array.isArray(stateObj._components)) {
                            for (const compRef of stateObj._components) {
                                const cId = compRef.__id__;
                                const compObj = data[cId];
                                if (compObj) {
                                    components.push({
                                        id: cId,
                                        type: compObj.__type__ || 'UnknownComponent',
                                        properties: { ...compObj }
                                    });
                                }
                            }
                        }

                        states.push({
                            id: sId,
                            name: sName,
                            type: stateObj.__type__,
                            speed: stateObj.speed,
                            editorExtras: stateObj.__editorExtras__,
                            components
                        });
                    }
                }

                // Transitions
                const transitions: any[] = [];
                if (Array.isArray(sm._transitions)) {
                    for (const transRef of sm._transitions) {
                        const tId = transRef.__id__;
                        const transObj = data[tId];
                        if (!transObj) continue;

                        const fromId = transObj.from?.__id__;
                        const toId = transObj.to?.__id__;

                        transitions.push({
                            id: tId,
                            type: transObj.__type__,
                            fromId,
                            fromState: stateIdToName.get(fromId) || `ID_${fromId}`,
                            toId,
                            toState: stateIdToName.get(toId) || `ID_${toId}`,
                            duration: transObj.duration,
                            exitConditionEnabled: transObj.exitConditionEnabled,
                            conditions: transObj.conditions
                        });
                    }
                }

                parsedStateMachines.push({
                    id: sm.__editorExtras__?.id,
                    statesCount: states.length,
                    transitionsCount: transitions.length,
                    states,
                    transitions
                });
            }

            return {
                success: true,
                data: {
                    name,
                    filePath,
                    variablesCount: Object.keys(variables).length,
                    variables,
                    stateMachinesCount: parsedStateMachines.length,
                    stateMachines: parsedStateMachines
                }
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to inspect animation graph: ${err.message}`
            };
        }
    }

    private async addComponent(animgraphPath: string, stateName: string, componentType: string, properties: any = {}): Promise<ToolResponse> {
        try {
            if (!stateName) return { success: false, error: 'stateName is required to add component' };
            if (!componentType) return { success: false, error: 'componentType is required to add component' };

            const { filePath, data } = await this.readGraphJson(animgraphPath);

            // Locate target state
            const stateObj = data.find(el => (el.__type__ === 'cc.animation.State' || el.__type__ === 'cc.animation.MotionState') && el.name === stateName);
            if (!stateObj) {
                return { success: false, error: `State "${stateName}" not found in animation graph` };
            }

            // Create new component entry
            const newComponent = {
                __type__: componentType,
                ...properties
            };

            const newIndex = data.length;
            data.push(newComponent);

            if (!Array.isArray(stateObj._components)) {
                stateObj._components = [];
            }
            stateObj._components.push({ __id__: newIndex });

            await this.saveGraphJson(filePath, animgraphPath, data);

            return {
                success: true,
                message: `Added component "${componentType}" to state "${stateName}" at index ${newIndex}`,
                data: {
                    stateName,
                    componentType,
                    componentId: newIndex,
                    properties: newComponent
                }
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to add component to state "${stateName}": ${err.message}`
            };
        }
    }

    private async updateComponent(animgraphPath: string, stateName: string, componentType?: string, properties: any = {}, componentIndex?: number): Promise<ToolResponse> {
        try {
            if (!stateName) return { success: false, error: 'stateName is required to update component' };

            const { filePath, data } = await this.readGraphJson(animgraphPath);

            const stateObj = data.find(el => (el.__type__ === 'cc.animation.State' || el.__type__ === 'cc.animation.MotionState') && el.name === stateName);
            if (!stateObj) {
                return { success: false, error: `State "${stateName}" not found in animation graph` };
            }

            if (!Array.isArray(stateObj._components) || stateObj._components.length === 0) {
                return { success: false, error: `State "${stateName}" has no components attached` };
            }

            let targetCompId: number | null = null;
            if (typeof componentIndex === 'number' && stateObj._components[componentIndex]) {
                targetCompId = stateObj._components[componentIndex].__id__;
            } else if (componentType) {
                for (const ref of stateObj._components) {
                    const c = data[ref.__id__];
                    if (c && c.__type__ === componentType) {
                        targetCompId = ref.__id__;
                        break;
                    }
                }
            } else {
                targetCompId = stateObj._components[0].__id__;
            }

            if (targetCompId === null || !data[targetCompId]) {
                return {
                    success: false,
                    error: `Component matching ${componentType || componentIndex} not found on state "${stateName}"`
                };
            }

            // Apply updates
            Object.assign(data[targetCompId], properties);

            await this.saveGraphJson(filePath, animgraphPath, data);

            return {
                success: true,
                message: `Updated component on state "${stateName}"`,
                data: {
                    stateName,
                    componentId: targetCompId,
                    component: data[targetCompId]
                }
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to update component on state "${stateName}": ${err.message}`
            };
        }
    }

    private async removeComponent(animgraphPath: string, stateName: string, componentType?: string, componentIndex?: number): Promise<ToolResponse> {
        try {
            if (!stateName) return { success: false, error: 'stateName is required to remove component' };

            const { filePath, data } = await this.readGraphJson(animgraphPath);

            const stateObj = data.find(el => (el.__type__ === 'cc.animation.State' || el.__type__ === 'cc.animation.MotionState') && el.name === stateName);
            if (!stateObj) {
                return { success: false, error: `State "${stateName}" not found in animation graph` };
            }

            if (!Array.isArray(stateObj._components) || stateObj._components.length === 0) {
                return { success: false, error: `State "${stateName}" has no components to remove` };
            }

            let removeIdx = -1;
            if (typeof componentIndex === 'number' && componentIndex >= 0 && componentIndex < stateObj._components.length) {
                removeIdx = componentIndex;
            } else if (componentType) {
                removeIdx = stateObj._components.findIndex((ref: any) => {
                    const c = data[ref.__id__];
                    return c && c.__type__ === componentType;
                });
            }

            if (removeIdx === -1) {
                return {
                    success: false,
                    error: `Component matching ${componentType || componentIndex} not found in state "${stateName}"`
                };
            }

            const removedRef = stateObj._components.splice(removeIdx, 1)[0];
            await this.saveGraphJson(filePath, animgraphPath, data);

            return {
                success: true,
                message: `Removed component from state "${stateName}" at index ${removeIdx}`,
                data: {
                    stateName,
                    removedComponentId: removedRef.__id__
                }
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to remove component from state "${stateName}": ${err.message}`
            };
        }
    }

    private async batchReplaceTypes(animgraphPath: string, fromType: string, toType: string): Promise<ToolResponse> {
        try {
            if (!fromType || !toType) {
                return { success: false, error: 'Both fromType and toType are required for batch_replace_types' };
            }

            const { filePath, data } = await this.readGraphJson(animgraphPath);
            let replacedCount = 0;

            for (const item of data) {
                if (item && item.__type__ === fromType) {
                    item.__type__ = toType;
                    replacedCount++;
                }
            }

            if (replacedCount > 0) {
                await this.saveGraphJson(filePath, animgraphPath, data);
            }

            return {
                success: true,
                message: `Replaced ${replacedCount} occurrence(s) of "${fromType}" with "${toType}"`,
                data: {
                    animgraphPath,
                    fromType,
                    toType,
                    replacedCount
                }
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to batch replace types: ${err.message}`
            };
        }
    }
}
