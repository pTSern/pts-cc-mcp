import { ToolDefinition, ToolResponse, ToolExecutor, ComponentInfo } from '../types';
import { EXTENSION_NAME, SCENE_SCRIPT_TARGET } from '../constants';
import { AssetResolver } from '../utils/asset-resolver';

export class ComponentTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'component_manage',
                description: 'COMPONENT MANAGEMENT: Add or remove built-in Cocos Creator components (cc.Sprite, cc.Button, etc.). WORKFLOW: 1) Use node_query to get nodeUuid, 2) Add components with componentType, 3) Use component_query to verify. For custom scripts use node_script_management from node-tools instead.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['add', 'remove'],
                            description: 'Component operation: "add" = attach built-in component(s) to node (requires componentType) | "remove" = detach specific component from node (requires exact CID from component_query)'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID (REQUIRED). WORKFLOW: Use node_query tool to find node UUID first. Format: "12345678-abcd-1234-5678-123456789abc". Cannot add/remove components without valid node UUID.'
                        },
                        componentType: {
                            type: ['string', 'array'],
                            items: { type: 'string' },
                            description: 'Component type(s) (REQUIRED). ADD: Built-in types like "cc.Sprite", "cc.Button", "cc.Label", "cc.RichText". Can be string or array. REMOVE: Must use exact CID from component_query list (format: "cc.Sprite@12345"). Common types: cc.Sprite (images), cc.Label (text), cc.Button (clickable).'
                        }
                    },
                    required: ['action', 'nodeUuid', 'componentType']
                }
            },
            {
                name: 'component_query',
                description: 'COMPONENT QUERY: Get component information, list all components on node, or get available component types. Use this FIRST to find component CIDs before removing!',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['list', 'info', 'available_types'],
                            description: 'Action: "list" = get all components on node | "info" = get specific component details | "available_types" = get all available component types'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID (required for "list" and "info" actions). Get from node tools first!'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type to get info for (required for "info" action). Use exact CID from list results.'
                        },
                        category: {
                            type: 'string',
                            enum: ['all', 'renderer', 'ui', 'physics', 'animation', 'audio'],
                            default: 'all',
                            description: 'Component category filter for available_types action'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'set_component_property',
                description: 'COMPONENT PROPERTY SETTER: Set component properties with strict type validation. CRITICAL WORKFLOW: 1) Use component_query to get exact componentType AND inspect property types, 2) Set properties with MANDATORY propertyType specification, 3) Verify results. SUPPORTS: All Cocos Creator built-in components (cc.Label, cc.Sprite, cc.Button) and custom script components. ⚠️ IMPORTANT: propertyType is REQUIRED - no automatic detection!',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID (REQUIRED). Get from node_query tool first. Format: "12345678-abcd-1234-5678-123456789abc". Must be valid scene node UUID.'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type identifier (REQUIRED). BUILT-IN: "cc.Label", "cc.Sprite", "cc.Button", "cc.UITransform". SCRIPTS: Use compressed UUID format like "3b6be0raOhG54eGN2c5M4cN" (get from component_query). CRITICAL: Use exact type string from component_query list action!'
                        },
                        // Support legacy format for single property setting (backward compatibility)
                        property: {
                            type: 'string',
                            description: 'Property name for single property setting. Examples: "string" (Label text), "fontSize" (Label size), "spriteFrame" (Sprite image), "color" (visual color), "player" (script node reference). Check component_query for available properties.'
                        },
                        propertyType: {
                            type: 'string',
                            description: 'Property data type (REQUIRED for single property setting). Use component_query to inspect the property and determine its exact type. CRITICAL: Must match actual property type exactly or setting will fail! No automatic detection available.',
                            enum: [
                                'string', 'number', 'boolean', 'integer', 'float',
                                'color', 'vec2', 'vec3', 'size',
                                'node', 'component', 'spriteFrame', 'prefab', 'asset',
                                'nodeArray', 'colorArray', 'numberArray', 'stringArray'
                            ]
                        },
                        value: {
                            description: 'Property value - format depends on propertyType. STRING: "Hello World", NUMBER: 42, BOOLEAN: true/false, COLOR: {"r":255,"g":0,"b":0,"a":255} or "#FF0000", VEC2: {"x":100,"y":50}, SIZE: {"width":200,"height":100}, NODE/ASSET: "uuid-string", ARRAYS: [...values]. See examples in properties description.'
                        },
                        // New batch property setting format
                        properties: {
                            type: 'object',
                            description: 'BATCH PROPERTY SETTING: Set multiple properties simultaneously for efficiency. Each property MUST specify exact type and value. CRITICAL: Property names must match exactly (case-sensitive), types must be accurate. Use component_query to inspect property types first!\n\n' +
                                '📝 FORMAT:\n' +
                                '{\n' +
                                '  "propertyName": {"type": "exactPropertyType", "value": actualValue}\n' +
                                '}\n\n' +
                                '🎯 EXAMPLES BY TYPE:\n' +
                                '• TEXT: {"string": {"type": "string", "value": "Hello World"}}\n' +
                                '• NUMBERS: {"fontSize": {"type": "number", "value": 28}}\n' +
                                '• COLORS: {"color": {"type": "color", "value": {"r":255,"g":100,"b":50,"a":255}}}\n' +
                                '• BOOLEANS: {"isBold": {"type": "boolean", "value": true}}\n' +
                                '• VECTORS: {"anchorPoint": {"type": "vec2", "value": {"x":0.5,"y":1.0}}}\n' +
                                '• SIZES: {"contentSize": {"type": "size", "value": {"width":200,"height":80}}}\n' +
                                '• NODE REFS: {"player": {"type": "node", "value": "node-uuid-here"}}\n' +
                                '• ASSETS: {"bulletPrefab": {"type": "prefab", "value": "prefab-uuid-here"}}\n' +
                                '• SPRITES: {"spriteFrame": {"type": "spriteFrame", "value": "sprite-uuid-here"}}\n\n' +
                                '⚠️ IMPORTANT: 1) Get UUIDs from asset_query and node_query tools first! 2) Use component_query to inspect exact property types - type mismatches will cause failures!',
                            additionalProperties: {
                                type: 'object',
                                properties: {
                                    type: {
                                        type: 'string',
                                        enum: [
                                            'string', 'number', 'boolean', 'integer', 'float',
                                            'color', 'vec2', 'vec3', 'size',
                                            'node', 'component', 'spriteFrame', 'prefab', 'asset',
                                            'nodeArray', 'colorArray', 'numberArray', 'stringArray'
                                        ]
                                    },
                                    value: {}
                                },
                                required: ['type', 'value']
                            }
                        }
                    },
                    required: ['nodeUuid', 'componentType']
                }
            },
            {
                name: 'configure_click_event',
                description: 'Configure or remove click events for Button components. Supports adding new events, removing specific events, or clearing all events.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID that has a Button component'
                        },
                        operation: {
                            type: 'string',
                            enum: ['add', 'modify', 'remove', 'clear'],
                            description: 'Operation type: "add" to add new event, "modify" to modify existing event, "remove" to remove specific event by index, "clear" to remove all events',
                            default: 'add'
                        },
                        targetNodeUuid: {
                            type: 'string',
                            description: 'Target node UUID that contains the script component with the callback method (required for "add" operation)'
                        },
                        componentName: {
                            type: 'string',
                            description: 'Name of the script component on target node (required for "add" operation)'
                        },
                        handlerName: {
                            type: 'string',
                            description: 'Method name to call when button is clicked (required for "add" operation)'
                        },
                        customEventData: {
                            type: 'string',
                            description: 'Optional custom event data to pass to the handler (for "add" operation)'
                        },
                        eventIndex: {
                            type: 'number',
                            description: 'Index of the specific event to remove (0-based, required for "remove" operation)'
                        }
                    },
                    required: ['nodeUuid']
                }
            },

            // 5. Universal Component Updater - Deep paths, custom @ccclass objects & arrays
            {
                name: 'update_component',
                description: 'UNIVERSAL COMPONENT UPDATER: Deeply updates any component properties on a node with full support for deep nested paths ("config.sid", "config.data", "_hookers.0.key"), custom @ccclass object structures, arrays of objects, and asset arrays (onUpdates). Automatically triggers scene change events and inspector refresh.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID (REQUIRED).'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component class name (e.g. "Energy_Manager", "cc.Sprite", or script CID).'
                        },
                        properties: {
                            type: 'object',
                            description: 'Properties to update. Supports deep dot-notation keys (e.g. {"config.sid": "config_heart", "config._$lock": true}) or nested objects (e.g. {"config": {"sid": "config_heart", "data": "uuid"}}) and arrays.'
                        },
                        autoSave: {
                            type: 'boolean',
                            default: false,
                            description: 'Whether to automatically save the scene after applying changes.'
                        }
                    },
                    required: ['nodeUuid', 'componentType', 'properties']
                }
            },

            // 6. Query Class Reflection Info
            {
                name: 'query_class_info',
                description: 'QUERY CLASS REFLECTION: Inspects all @ccclass property definitions, data types, defaults, and @property decorators for any class name or constructor in the Cocos engine.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        className: {
                            type: 'string',
                            description: 'Target class name (e.g. "Energy_Manager", "Helper_IdSelector", "cc.Sprite").'
                        }
                    },
                    required: ['className']
                }
            },

            // 7. Spine / FastSpine Character Setup Helper
            {
                name: 'spine_setup',
                description: 'SPINE / FASTSPINE CHARACTER SETUP: Helper tool to attach FastSpine (or sp.Skeleton) to a node, bind skeleton data asset, configure default animation, loop mode, and ensure UITransform setup in one call.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID (REQUIRED).'
                        },
                        spineAssetPath: {
                            type: 'string',
                            description: 'Path or UUID to Spine/FastSpine skeleton data (e.g. "db://assets/.../character.fastspine.bin" or ".json") (REQUIRED).'
                        },
                        defaultAnimation: {
                            type: 'string',
                            description: 'Default animation name (e.g. "Idle", "walk").'
                        },
                        loop: {
                            type: 'boolean',
                            description: 'Whether animation should loop.',
                            default: true
                        },
                        componentType: {
                            type: 'string',
                            enum: ['FastSpine', 'sp.Skeleton'],
                            description: 'Target component class ("FastSpine" or "sp.Skeleton"). Default: "FastSpine".',
                            default: 'FastSpine'
                        },
                        autoSave: {
                            type: 'boolean',
                            description: 'Whether to automatically save scene/prefab after setup.',
                            default: true
                        }
                    },
                    required: ['nodeUuid', 'spineAssetPath']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'component_manage':
                return await this.handleComponentManage(args);
            case 'component_query':
                return await this.handleComponentQuery(args);
            case 'set_component_property':
                return await this.setComponentProperties(args);
            case 'configure_click_event':
                return await this.configureClickEvent(args);
            case 'update_component':
                return await this.updateComponent(args);
            case 'query_class_info':
                return await this.queryClassInfo(args);
            case 'spine_setup':
                return await this.handleSpineSetup(args);
            // Backward compatibility support
            case 'add_component':
                return await this.addComponents(args.nodeUuid, args.componentType);
            case 'remove_component':
                return await this.removeComponent(args.nodeUuid, args.componentType);
            case 'get_components':
                return await this.getComponents(args.nodeUuid);
            case 'get_component_info':
                return await this.getComponentInfo(args.nodeUuid, args.componentType);
            case 'get_available_components':
                return await this.getAvailableComponents(args.category);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    // New consolidated handler function
    private async handleComponentManage(args: any): Promise<ToolResponse> {
        const { action, nodeUuid, componentType } = args;
        
        switch (action) {
            case 'add':
                return await this.addComponents(nodeUuid, componentType);
            case 'remove':
                return await this.removeComponent(nodeUuid, componentType);
            case 'spine_setup':
                return await this.handleSpineSetup(args);
            default:
                return { success: false, error: `Unknown component manage action: ${action}` };
        }
    }

    private async handleComponentQuery(args: any): Promise<ToolResponse> {
        const { action, nodeUuid, componentType, category } = args;
        
        switch (action) {
            case 'list':
                return await this.getComponents(nodeUuid);
            case 'info':
                return await this.getComponentInfo(nodeUuid, componentType);
            case 'available_types':
                return await this.getAvailableComponents(category || 'all');
            default:
                return { success: false, error: `Unknown query action: ${action}` };
        }
    }

    /**
     * Get specific notification messages after successfully adding a component
     */
    private getComponentReminder(componentType: string): string {
        const reminders: { [key: string]: string } = {
            'cc.Sprite': 'REMINDER: Set "spriteFrame" property to display the sprite. Use set_component_property to assign a sprite frame asset.',
            'cc.Label': 'REMINDER: Set "string" property to display text content. Example: {"string": {"type": "string", "value": "Hello World"}}',
            'cc.Button': 'REMINDER: Configure click events using configure_click_event tool. Also consider setting "normalColor", "pressedColor" and "transition" properties.',
            'cc.EditBox': 'REMINDER: Set "string" property for placeholder text and configure "backgroundImage" for visual styling.',
            'cc.ProgressBar': 'REMINDER: Set "totalLength" and "progress" properties to make the progress bar functional.',
            'cc.Slider': 'REMINDER: Set "progress" property (0-1 range) and configure "handle" and "background" sprites.',
            'cc.ScrollView': 'REMINDER: Configure "content" node and set "horizontal" or "vertical" scroll directions.',
            'cc.PageView': 'REMINDER: Add child nodes as pages and set "direction" property (horizontal/vertical).',
            'cc.Toggle': 'REMINDER: Set "isChecked" property and configure "checkMark" sprite for visual feedback.',
            'cc.ToggleGroup': 'REMINDER: Assign toggle components to this group and set "allowSwitchOff" if needed.'
        };
        
        return reminders[componentType] || '';
    }

    private async addComponents(nodeUuid: string, componentTypes: string | string[]): Promise<ToolResponse> {
        // Normalize input to an array
        const typesToAdd = Array.isArray(componentTypes) ? componentTypes : [componentTypes];
        
        if (typesToAdd.length === 0) {
            return { success: false, error: 'No component types provided' };
        }
        
        // If there is only one component, use the original single component add logic
        if (typesToAdd.length === 1) {
            return await this.addComponent(nodeUuid, typesToAdd[0]);
        }
        
        // Batch add multiple components
        return await this.addMultipleComponents(nodeUuid, typesToAdd);
    }

    private async addMultipleComponents(nodeUuid: string, componentTypes: string[]): Promise<ToolResponse> {
        const results: any[] = [];
        const errors: string[] = [];
        let successCount = 0;
        
        for (const componentType of componentTypes) {
            try {
                const result = await this.addComponent(nodeUuid, componentType);
                results.push({
                    componentType,
                    success: result.success,
                    message: result.message,
                    error: result.error
                });
                
                if (result.success) {
                    successCount++;
                } else {
                    errors.push(`${componentType}: ${result.error}`);
                }
            } catch (err: any) {
                const errorMsg = `${componentType}: ${err.message}`;
                errors.push(errorMsg);
                results.push({
                    componentType,
                    success: false,
                    error: errorMsg
                });
            }
        }
        
        const totalRequested = componentTypes.length;
        const isFullSuccess = successCount === totalRequested;
        
        return {
            success: isFullSuccess,
            message: isFullSuccess 
                ? `Successfully added all ${successCount} components`
                : `Added ${successCount} of ${totalRequested} components`,
            data: {
                nodeUuid,
                totalRequested,
                totalAdded: successCount,
                results,
                errors: errors.length > 0 ? errors : undefined
            }
        };
    }

    private async addComponent(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        // First check if the component already exists on the node
        const allComponentsInfo = await this.getComponents(nodeUuid);
        if (allComponentsInfo.success && allComponentsInfo.data?.components) {
            const existingComponent = allComponentsInfo.data.components.find((comp: any) => comp.type === componentType);
            if (existingComponent) {
                const reminder = this.getComponentReminder(componentType);
                const message = reminder
                    ? `Component '${componentType}' already exists on node. ${reminder}`
                    : `Component '${componentType}' already exists on node`;

                return {
                    success: true,
                    message: message,
                    data: {
                        nodeUuid: nodeUuid,
                        componentType: componentType,
                        componentVerified: true,
                        existing: true
                    }
                };
            }
        }
        // Attempt to add component directly using Editor API
        try {
            await Editor.Message.request('scene', 'create-component', {
                uuid: nodeUuid,
                component: componentType
            });
            // Wait a short time for Editor to complete adding the component
            await new Promise(resolve => setTimeout(resolve, 100));
            // Re-query node info to verify if the component was successfully added
            try {
                const allComponentsInfo2 = await this.getComponents(nodeUuid);
                if (allComponentsInfo2.success && allComponentsInfo2.data?.components) {
                    const addedComponent = allComponentsInfo2.data.components.find((comp: any) => comp.type === componentType);
                    if (addedComponent) {
                        const reminder = this.getComponentReminder(componentType);
                        const message = reminder
                            ? `Component '${componentType}' added successfully. ${reminder}`
                            : `Component '${componentType}' added successfully`;

                        return {
                            success: true,
                            message: message,
                            data: {
                                nodeUuid: nodeUuid,
                                componentType: componentType,
                                componentVerified: true,
                                existing: false
                            }
                        };
                    } else {
                        return {
                            success: false,
                            error: `Component '${componentType}' was not found on node after addition. Available components: ${allComponentsInfo2.data.components.map((c: any) => c.type).join(', ')}`
                        };
                    }
                } else {
                    return {
                        success: false,
                        error: `Failed to verify component addition: ${allComponentsInfo2.error || 'Unable to get node components'}`
                    };
                }
            } catch (verifyError: any) {
                return {
                    success: false,
                    error: `Failed to verify component addition: ${verifyError.message}`
                };
            }
        } catch (err: any) {
            // Fallback: use scene script
            const options = {
                name: SCENE_SCRIPT_TARGET,
                method: 'addComponentToNode',
                args: [nodeUuid, componentType]
            };
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', options);
                return result;
            } catch (err2: any) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }

    private async removeComponent(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        // 1. Find all components on the node
        const allComponentsInfo = await this.getComponents(nodeUuid);
        if (!allComponentsInfo.success || !allComponentsInfo.data?.components) {
            return { success: false, error: `Failed to get components for node '${nodeUuid}': ${allComponentsInfo.error}` };
        }

        // 2. Find the component index where type field equals componentType
        const componentIndex = allComponentsInfo.data.components.findIndex((comp: any) => comp.type === componentType);
        if (componentIndex === -1) {
            return { success: false, error: `Component cid '${componentType}' not found on node '${nodeUuid}'. Please use getComponents to get the type field (cid) as componentType.` };
        }

        // 3. Try multiple API methods to remove component
        try {
            console.log(`Attempting to remove component at index ${componentIndex} (type: ${componentType}) from node ${nodeUuid}`);

            let removeSuccessful = false;

            // Method 1: Use remove-array-element API (based on message logs)
            try {
                await Editor.Message.request('scene', 'remove-array-element', {
                    uuid: nodeUuid,
                    path: '__comps__',
                    index: componentIndex
                });
                removeSuccessful = true;
            } catch (removeError) {
                console.log(`remove-array-element failed:`, removeError);
            }

            // Method 2: Try delete-component API
            if (!removeSuccessful) {
                try {
                    await Editor.Message.request('scene', 'delete-component', {
                        uuid: nodeUuid,
                        component: componentType
                    });
                    removeSuccessful = true;
                } catch (deleteError) {
                    console.log(`delete-component failed:`, deleteError);
                }
            }

            // Method 3: Fallback - use original remove-component API with index
            if (!removeSuccessful) {
                try {
                    await Editor.Message.request('scene', 'remove-component', {
                        uuid: nodeUuid,
                        component: componentIndex
                    });
                    removeSuccessful = true;
                } catch (removeError2) {
                    console.log(`remove-component with index failed:`, removeError2);
                }
            }

            // Method 4: Try remove-component API with type name (original code)
            if (!removeSuccessful) {
                try {
                    await Editor.Message.request('scene', 'remove-component', {
                        uuid: nodeUuid,
                        component: componentType
                    });
                    removeSuccessful = true;
                } catch (removeError3) {
                    console.log(`remove-component with type failed:`, removeError3);
                }
            }

            // 4. Query once more to confirm whether it was removed
            const afterRemoveInfo = await this.getComponents(nodeUuid);
            const stillExists = afterRemoveInfo.success && afterRemoveInfo.data?.components?.some((comp: any) => comp.type === componentType);
            console.log(`After removal - components count: ${afterRemoveInfo.data?.components?.length}, still exists: ${stillExists}`);

            if (stillExists) {
                return { success: false, error: `Component cid '${componentType}' was not removed from node '${nodeUuid}'. Index used: ${componentIndex}` };
            } else {
                return {
                    success: true,
                    message: `✅ Component '${componentType}' removed`,
                    data: { nodeUuid, componentType, removedIndex: componentIndex }
                };
            }
        } catch (err: any) {
            console.log(`Remove component error:`, err);
            return { success: false, error: `Failed to remove component: ${err.message}` };
        }
    }

    private async getComponents(nodeUuid: string): Promise<ToolResponse> {
        // Prefer querying node info directly using Editor API
        try {
            const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (nodeData && nodeData.__comps__) {
                const components = nodeData.__comps__.map((comp: any) => ({
                    type: comp.__type__ || comp.cid || comp.type || 'Unknown',
                    uuid: comp.uuid?.value || comp.uuid || null,
                    enabled: comp.enabled !== undefined ? comp.enabled : true,
                    properties: this.extractComponentProperties(comp)
                }));

                return {
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        components: components
                    }
                };
            } else {
                return { success: false, error: 'Node not found or no components data' };
            }
        } catch (err: any) {
            // Fallback: use scene script
            const options = {
                name: SCENE_SCRIPT_TARGET,
                method: 'getNodeInfo',
                args: [nodeUuid]
            };

            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', options);
                if (result.success) {
                    return {
                        success: true,
                        data: result.data.components
                    };
                } else {
                    return result;
                }
            } catch (err2: any) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }

    private async getComponentInfo(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        // Prefer querying node info directly using Editor API
        try {
            const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (nodeData && nodeData.__comps__) {
                const component = nodeData.__comps__.find((comp: any) => {
                    const compType = comp.__type__ || comp.cid || comp.type;
                    return compType === componentType;
                });

                if (component) {
                    return {
                        success: true,
                        data: {
                            nodeUuid: nodeUuid,
                            componentType: componentType,
                            enabled: (component as any).enabled !== undefined ? (component as any).enabled : true,
                            properties: this.extractComponentProperties(component)
                        }
                    };
                } else {
                    return { success: false, error: `Component '${componentType}' not found on node` };
                }
            } else {
                return { success: false, error: 'Node not found or no components data' };
            }
        } catch (err: any) {
            // Fallback: use scene script
            const options = {
                name: SCENE_SCRIPT_TARGET,
                method: 'getNodeInfo',
                args: [nodeUuid]
            };

            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', options);
                if (result.success && result.data.components) {
                    const component = result.data.components.find((comp: any) => comp.type === componentType);
                    if (component) {
                        return {
                            success: true,
                            data: {
                                nodeUuid: nodeUuid,
                                componentType: componentType,
                                ...component
                            }
                        };
                    } else {
                        return { success: false, error: `Component '${componentType}' not found on node` };
                    }
                } else {
                    return { success: false, error: result.error || 'Failed to get component info' };
                }
            } catch (err2: any) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }

    private extractComponentProperties(component: any): Record<string, any> {
        console.log(`[extractComponentProperties] Processing component:`, Object.keys(component));
        
        // Check if component has a value property, which usually contains actual component properties
        if (component.value && typeof component.value === 'object') {
            console.log(`[extractComponentProperties] Found component.value with properties:`, Object.keys(component.value));
            return component.value; // Directly return value object, which contains all component properties
        }
        
        // Fallback: extract properties directly from component object
        const properties: Record<string, any> = {};
        const excludeKeys = ['__type__', 'enabled', 'node', '_id', '__scriptAsset', 'uuid', 'name', '_name', '_objFlags', '_enabled', 'type', 'readonly', 'visible', 'cid', 'editor', 'extends'];
        
        for (const key in component) {
            if (!excludeKeys.includes(key) && !key.startsWith('_')) {
                console.log(`[extractComponentProperties] Found direct property '${key}':`, typeof component[key]);
                properties[key] = component[key];
            }
        }
        
        console.log(`[extractComponentProperties] Final extracted properties:`, Object.keys(properties));
        return properties;
    }

    private async findComponentTypeByUuid(componentUuid: string): Promise<string | null> {
        console.log(`[findComponentTypeByUuid] Searching for component type with UUID: ${componentUuid}`);
        if (!componentUuid) {
            return null;
        }
        try {
            const nodeTree = await Editor.Message.request('scene', 'query-node-tree');
            if (!nodeTree) {
                console.warn('[findComponentTypeByUuid] Failed to query node tree.');
                return null;
            }

            const queue: any[] = [nodeTree];
            
            while (queue.length > 0) {
                const currentNodeInfo = queue.shift();
                if (!currentNodeInfo || !currentNodeInfo.uuid) {
                    continue;
                }

                try {
                    const fullNodeData = await Editor.Message.request('scene', 'query-node', currentNodeInfo.uuid);
                    if (fullNodeData && fullNodeData.__comps__) {
                        for (const comp of fullNodeData.__comps__) {
                            const compAny = comp as any; // Cast to any to access dynamic properties
                            // The component UUID is nested in the 'value' property
                            if (compAny.uuid && compAny.uuid.value === componentUuid) {
                                const componentType = compAny.__type__;
                                console.log(`[findComponentTypeByUuid] Found component type '${componentType}' for UUID ${componentUuid} on node ${fullNodeData.name?.value}`);
                                return componentType;
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`[findComponentTypeByUuid] Could not query node ${currentNodeInfo.uuid}:`, e);
                }

                if (currentNodeInfo.children) {
                    for (const child of currentNodeInfo.children) {
                        queue.push(child);
                    }
                }
            }

            console.warn(`[findComponentTypeByUuid] Component with UUID ${componentUuid} not found in scene tree.`);
            return null;
        } catch (error) {
            console.error(`[findComponentTypeByUuid] Error while searching for component type:`, error);
            return null;
        }
    }

    private async setComponentProperties(args: any): Promise<ToolResponse> {
        // Check whether it is a single property setting or batch property setting
        if (args.properties) {
            // Batch property setting
            return await this.setMultipleComponentProperties(args);
        } else if (args.property && args.propertyType && args.value !== undefined) {
            // Single property setting (propertyType is required)
            return await this.setComponentProperty(args);
        } else {
            return {
                success: false,
                error: 'Invalid parameters. Use either single property format (property, propertyType, value) or batch format (properties). PropertyType is REQUIRED for single property setting!'
            };
        }
    }

    private async setMultipleComponentProperties(args: any): Promise<ToolResponse> {
        const { nodeUuid, componentType, properties } = args;
        
        if (!properties || typeof properties !== 'object') {
            return {
                success: false,
                error: 'Properties parameter must be an object with property definitions'
            };
        }

        const results: any[] = [];
        const errors: string[] = [];
        let successCount = 0;
        const propertyNames = Object.keys(properties);

        for (const propertyName of propertyNames) {
            const propertyDef = properties[propertyName];
            
            if (!propertyDef.type || propertyDef.value === undefined) {
                const error = `Property '${propertyName}' must have 'type' and 'value' fields`;
                errors.push(error);
                results.push({
                    property: propertyName,
                    success: false,
                    error
                });
                continue;
            }

            try {
                const result = await this.setComponentProperty({
                    nodeUuid,
                    componentType,  
                    property: propertyName,
                    propertyType: propertyDef.type,
                    value: propertyDef.value
                });

                results.push({
                    property: propertyName,
                    success: result.success,
                    message: result.message,
                    error: result.error
                });

                if (result.success) {
                    successCount++;
                } else {
                    errors.push(`${propertyName}: ${result.error}`);
                }
            } catch (err: any) {
                const errorMsg = `${propertyName}: ${err.message}`;
                errors.push(errorMsg);
                results.push({
                    property: propertyName,
                    success: false,
                    error: errorMsg
                });
            }
        }

        const totalRequested = propertyNames.length;
        const isFullSuccess = successCount === totalRequested;

        return {
            success: isFullSuccess,
            message: isFullSuccess 
                ? `Successfully set all ${successCount} properties`
                : `Set ${successCount} of ${totalRequested} properties`,
            data: {
                nodeUuid,
                componentType,
                totalRequested,
                totalSet: successCount,
                results,
                errors: errors.length > 0 ? errors : undefined
            }
        };
    }

    private async setComponentProperty(args: any): Promise<ToolResponse> {
        const { nodeUuid, componentType, property, propertyType, value } = args;

        try {
            console.log(`[ComponentTools] Setting ${componentType}.${property} (type: ${propertyType}) = ${JSON.stringify(value)} on node ${nodeUuid}`);

            // Step 0: Check if it is a node property, redirect to corresponding node method if so
            const nodeRedirectResult = await this.checkAndRedirectNodeProperties(args);
            if (nodeRedirectResult) {
                return nodeRedirectResult;
            }

            // Step 1: Get component info using the same method as getComponents
            const componentsResponse = await this.getComponents(nodeUuid);
            if (!componentsResponse.success || !componentsResponse.data) {
                return {
                    success: false,
                    error: `Failed to get components for node '${nodeUuid}': ${componentsResponse.error}`,
                    instruction: `Please verify that node UUID '${nodeUuid}' is correct. Use get_all_nodes or find_node_by_name to get the correct node UUID.`
                };
            }

            const allComponents = componentsResponse.data.components;

            // Step 2: Find target component
            let targetComponent = null;
            const availableTypes: string[] = [];

            for (let i = 0; i < allComponents.length; i++) {
                const comp = allComponents[i];
                availableTypes.push(comp.type);

                if (comp.type === componentType) {
                    targetComponent = comp;
                    break;
                }
            }

            if (!targetComponent) {
                // Provide more detailed error message and suggestions
                const instruction = this.generateComponentSuggestion(componentType, availableTypes, property);
                return {
                    success: false,
                    error: `Component '${componentType}' not found on node. Available components: ${availableTypes.join(', ')}`,
                    instruction: instruction
                };
            }

            // Step 3: Automatically detect and convert property value
            let propertyInfo;
            try {
                console.log(`[ComponentTools] Analyzing property: ${property}`);
                propertyInfo = this.analyzeProperty(targetComponent, property);
            } catch (analyzeError: any) {
                console.error(`[ComponentTools] Error in analyzeProperty:`, analyzeError);
                return {
                    success: false,
                    error: `Failed to analyze property '${property}': ${analyzeError.message}`
                };
            }

            if (!propertyInfo.exists) {
                return {
                    success: false,
                    error: `Property '${property}' not found on component '${componentType}'. Available properties: ${propertyInfo.availableProperties.join(', ')}`
                };
            }

            // Step 4: Process property value and set
            const originalValue = propertyInfo.originalValue;
            let processedValue: any;

            // Check if required propertyType is provided
            if (!propertyType) {
                return {
                    success: false,
                    error: `Property type is required for property '${property}'. Please specify propertyType parameter. Available types: string, number, boolean, color, vec2, vec3, size, node, component, spriteFrame, prefab, asset, nodeArray, colorArray, numberArray, stringArray.`,
                    instruction: `Use component_query to inspect the property and determine its correct type, then specify propertyType parameter.`
                };
            }
                
                let finalPropertyType = propertyType;
                
                // Process property value according to explicit propertyType
                switch (finalPropertyType) {
                    case 'string':
                        processedValue = String(value);
                        break;
                    case 'number':
                    case 'integer':
                    case 'float':
                        processedValue = Number(value);
                        break;
                    case 'boolean':
                        processedValue = Boolean(value);
                        break;
                    case 'color':
                        if (typeof value === 'string') {
                            // String format: support hexadecimal, color name, rgb()/rgba()
                            processedValue = this.parseColorString(value);
                        } else if (typeof value === 'object' && value !== null) {
                            // Object format: validate and convert RGBA values
                            processedValue = {
                                r: Math.min(255, Math.max(0, Number(value.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(value.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(value.b) || 0)),
                                a: value.a !== undefined ? Math.min(255, Math.max(0, Number(value.a))) : 255
                            };
                        } else {
                            throw new Error(`Color value must be an object with r, g, b properties or a hexadecimal string. Expected: {"r":255,"g":0,"b":0,"a":255} or "#FF0000", but received: ${JSON.stringify(value)} (${typeof value})`);
                        }
                        break;
                    case 'vec2':
                        if (typeof value === 'object' && value !== null && 'x' in value && 'y' in value) {
                            processedValue = {
                                x: Number(value.x) || 0,
                                y: Number(value.y) || 0
                            };
                        } else {
                            throw new Error(`Vec2 value must be an object with x, y properties. Expected: {"x":100,"y":50}, but received: ${JSON.stringify(value)} (${typeof value})`);
                        }
                        break;
                    case 'vec3':
                        if (typeof value === 'object' && value !== null && 'x' in value && 'y' in value && 'z' in value) {
                            processedValue = {
                                x: Number(value.x) || 0,
                                y: Number(value.y) || 0,
                                z: Number(value.z) || 0
                            };
                        } else {
                            throw new Error(`Vec3 value must be an object with x, y, z properties. Expected: {"x":1,"y":2,"z":3}, but received: ${JSON.stringify(value)} (${typeof value})`);
                        }
                        break;
                    case 'size':
                        if (typeof value === 'object' && value !== null) {
                            if ('width' in value && 'height' in value) {
                                processedValue = {
                                    width: Number(value.width) || 0,
                                    height: Number(value.height) || 0
                                };
                            } else {
                                throw new Error(`Size value must be an object with width, height properties. Expected: {"width":100,"height":50}, but received: ${JSON.stringify(value)}`);
                            }
                        } else {
                            throw new Error(`Size value must be an object with width, height properties. Expected: {"width":100,"height":50}, but received: ${JSON.stringify(value)} (${typeof value})`);
                        }
                        break;
                    case 'node':
                        if (typeof value === 'string') {
                            processedValue = { uuid: value };
                        } else {
                            throw new Error('Node reference value must be a string UUID');
                        }
                        break;
                    case 'component':
                        if (typeof value === 'string') {
                            // Component references require special handling: find component __id__ via node UUID
                            processedValue = value; // Save node UUID first, will be converted to __id__ later
                        } else {
                            throw new Error('Component reference value must be a string (node UUID containing the target component)');
                        }
                        break;
                    case 'spriteFrame':
                        if (typeof value === 'string') {
                            const resolved = await AssetResolver.resolve(value, 'spriteFrame');
                            const targetUuid = (resolved && resolved.resolvedUuid) ? resolved.resolvedUuid : value;
                            processedValue = { uuid: targetUuid };
                        } else {
                            throw new Error('spriteFrame value must be a string UUID or asset path');
                        }
                        break;
                    case 'prefab':
                    case 'asset':
                        if (typeof value === 'string') {
                            const resolved = await AssetResolver.resolve(value);
                            const targetUuid = (resolved && (resolved.resolvedUuid || resolved.uuid)) ? (resolved.resolvedUuid || resolved.uuid) : value;
                            processedValue = { uuid: targetUuid };
                        } else {
                            throw new Error(`${finalPropertyType} value must be a string UUID or asset path`);
                        }
                        break;
                    case 'nodeArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item: any) => {
                                if (typeof item === 'string') {
                                    return { uuid: item };
                                } else {
                                    throw new Error('NodeArray items must be string UUIDs');
                                }
                            });
                        } else {
                            throw new Error('NodeArray value must be an array');
                        }
                        break;
                    case 'colorArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item: any) => {
                                if (typeof item === 'object' && item !== null && 'r' in item) {
                                    return {
                                        r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                        g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                        b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                        a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                                    };
                                } else {
                                    return { r: 255, g: 255, b: 255, a: 255 };
                                }
                            });
                        } else {
                            throw new Error('ColorArray value must be an array');
                        }
                        break;
                    case 'numberArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item: any) => Number(item));
                        } else {
                            throw new Error('NumberArray value must be an array');
                        }
                        break;
                    case 'stringArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item: any) => String(item));
                        } else {
                            throw new Error('StringArray value must be an array');
                        }
                        break;
                    default:
                        throw new Error(`Unsupported property type: ${finalPropertyType}`);
                }
                
                console.log(`[ComponentTools] Converting value: ${JSON.stringify(value)} -> ${JSON.stringify(processedValue)} (type: ${finalPropertyType})`);
                console.log(`[ComponentTools] Property analysis result: propertyInfo.type="${propertyInfo.type}", propertyType="${finalPropertyType}"`);
                console.log(`[ComponentTools] Will use color special handling: ${finalPropertyType === 'color' && processedValue && typeof processedValue === 'object'}`);
                
                // Actual expected value for verification (special handling needed for component references)
                let actualExpectedValue = processedValue;
                
                // Step 5: Get raw node data to build the correct path
                const rawNodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
                if (!rawNodeData || !rawNodeData.__comps__) {
                    return {
                        success: false,
                        error: `Failed to get raw node data for property setting`
                    };
                }

                // Find index of the original component
                let rawComponentIndex = -1;
                for (let i = 0; i < rawNodeData.__comps__.length; i++) {
                    const comp = rawNodeData.__comps__[i] as any;
                    const compType = comp.__type__ || comp.cid || comp.type || 'Unknown';
                    if (compType === componentType) {
                        rawComponentIndex = i;
                        break;
                    }
                }

                if (rawComponentIndex === -1) {
                    return {
                        success: false,
                        error: `Could not find component index for setting property`
                    };
                }
                
                // Build the correct property path
                let propertyPath = `__comps__.${rawComponentIndex}.${property}`;
                
                // Special handling for asset properties
                if (finalPropertyType === 'asset' || finalPropertyType === 'spriteFrame' || finalPropertyType === 'prefab' || 
                    (propertyInfo.type === 'asset' && finalPropertyType === 'string')) {
                    
                    console.log(`[ComponentTools] Setting asset reference:`, {
                        value: processedValue,
                        property: property,
                        propertyType: finalPropertyType,
                        path: propertyPath
                    });
                    
                    // Determine asset type based on property name
                    let assetType = 'cc.SpriteFrame'; // default
                    if (property.toLowerCase().includes('texture')) {
                        assetType = 'cc.Texture2D';
                    } else if (property.toLowerCase().includes('material')) {
                        assetType = 'cc.Material';
                    } else if (property.toLowerCase().includes('font')) {
                        assetType = 'cc.Font';
                    } else if (property.toLowerCase().includes('clip')) {
                        assetType = 'cc.AudioClip';
                    } else if (finalPropertyType === 'prefab') {
                        assetType = 'cc.Prefab';
                    }
                    
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { 
                            value: processedValue,
                            type: assetType
                        }
                    });
                } else if (componentType === 'cc.UITransform' && (property === '_contentSize' || property === 'contentSize')) {
                    // Special handling for UITransform contentSize - set width and height separately
                    // FIXED: Use proper null checking instead of || which treats 0 as falsy
                    const width = value.width !== undefined ? Number(value.width) : 100;
                    const height = value.height !== undefined ? Number(value.height) : 100;
                    
                    // Set width first
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.width`,
                        dump: { value: width }
                    });
                    
                    // Then set height
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.height`,
                        dump: { value: height }
                    });
                } else if (componentType === 'cc.UITransform' && (property === '_anchorPoint' || property === 'anchorPoint')) {
                    // Special handling for UITransform anchorPoint - set anchorX and anchorY separately
                    // FIXED: Use proper null checking instead of || which treats 0 as falsy
                    const anchorX = value.x !== undefined ? Number(value.x) : 0.5;
                    const anchorY = value.y !== undefined ? Number(value.y) : 0.5;
                    
                    // Set anchorX first
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.anchorX`,
                        dump: { value: anchorX }
                    });
                    
                    // Then set anchorY  
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.anchorY`,
                        dump: { value: anchorY }
                    });
                } else if (propertyType === 'color' && processedValue && typeof processedValue === 'object') {
                    // Special handling for color properties, ensure RGBA values are correct
                    // Cocos Creator color value range is 0-255
                    const colorValue = {
                        r: Math.min(255, Math.max(0, Number(processedValue.r) || 0)),
                        g: Math.min(255, Math.max(0, Number(processedValue.g) || 0)),
                        b: Math.min(255, Math.max(0, Number(processedValue.b) || 0)),
                        a: processedValue.a !== undefined ? Math.min(255, Math.max(0, Number(processedValue.a))) : 255
                    };
                    
                    console.log(`[ComponentTools] Setting color value:`, colorValue);
                    
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { 
                            value: colorValue,
                            type: 'cc.Color'
                        }
                    });
                } else if (propertyType === 'vec3' && processedValue && typeof processedValue === 'object') {
                    // Special handling for Vec3 properties
                    const vec3Value = {
                        x: Number(processedValue.x) || 0,
                        y: Number(processedValue.y) || 0,
                        z: Number(processedValue.z) || 0
                    };
                    
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { 
                            value: vec3Value,
                            type: 'cc.Vec3'
                        }
                    });
                } else if (propertyType === 'vec2' && processedValue && typeof processedValue === 'object') {
                    // Special handling for Vec2 properties
                    const vec2Value = {
                        x: Number(processedValue.x) || 0,
                        y: Number(processedValue.y) || 0
                    };
                    
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { 
                            value: vec2Value,
                            type: 'cc.Vec2'
                        }
                    });
                } else if (propertyType === 'size' && processedValue && typeof processedValue === 'object') {
                    // Special handling for Size properties
                    const sizeValue = {
                        width: Number(processedValue.width) || 0,
                        height: Number(processedValue.height) || 0
                    };
                    
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { 
                            value: sizeValue,
                            type: 'cc.Size'
                        }
                    });
                } else if (propertyType === 'node' && processedValue && typeof processedValue === 'object' && 'uuid' in processedValue) {
                    // Special handling for node references
                    console.log(`[ComponentTools] Setting node reference with UUID: ${processedValue.uuid}`);
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { 
                            value: processedValue,
                            type: 'cc.Node'
                        }
                    });
                } else if (propertyType === 'component' && typeof processedValue === 'string') {
                    // Special handling for component references: find component __id__ via node UUID
                    const targetNodeUuid = processedValue;
                    console.log(`[ComponentTools] Setting component reference - finding component on node: ${targetNodeUuid}`);
                    
                    // Get expected component type from current component's property metadata
                    let expectedComponentType = '';
                    
                    // Get detailed info of current component, including property metadata
                    const currentComponentInfo = await this.getComponentInfo(nodeUuid, componentType);
                    if (currentComponentInfo.success && currentComponentInfo.data?.properties?.[property]) {
                        const propertyMeta = currentComponentInfo.data.properties[property];
                        
                        // Extract component type info from property metadata
                        if (propertyMeta && typeof propertyMeta === 'object') {
                            // Check if there is a type field indicating component type
                            if (propertyMeta.type) {
                                expectedComponentType = propertyMeta.type;
                            } else if (propertyMeta.ctor) {
                                // Some properties may use ctor field
                                expectedComponentType = propertyMeta.ctor;
                            } else if (propertyMeta.extends && Array.isArray(propertyMeta.extends)) {
                                // Check extends array, usually the first one is the most specific type
                                for (const extendType of propertyMeta.extends) {
                                    if (extendType.startsWith('cc.') && extendType !== 'cc.Component' && extendType !== 'cc.Object') {
                                        expectedComponentType = extendType;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    
                    if (!expectedComponentType) {
                        throw new Error(`Unable to determine required component type for property '${property}' on component '${componentType}'. Property metadata may not contain type information.`);
                    }
                    
                    console.log(`[ComponentTools] Detected required component type: ${expectedComponentType} for property: ${property}`);
                    
                    try {
                        // Get component info of target node
                        const targetNodeData = await Editor.Message.request('scene', 'query-node', targetNodeUuid);
                        if (!targetNodeData || !targetNodeData.__comps__) {
                            throw new Error(`Target node ${targetNodeUuid} not found or has no components`);
                        }
                        
                        // Print component overview of target node
                        console.log(`[ComponentTools] Target node ${targetNodeUuid} has ${targetNodeData.__comps__.length} components:`);
                        targetNodeData.__comps__.forEach((comp: any, index: number) => {
                            const sceneId = comp.value && comp.value.uuid && comp.value.uuid.value ? comp.value.uuid.value : 'unknown';
                            console.log(`[ComponentTools] Component ${index}: ${comp.type} (scene_id: ${sceneId})`);
                        });
                        
                        // Find matching component
                        let targetComponent = null;
                        let componentId: string | null = null;
                        
                        // Find component of specified type in target node's _components array
                        // Note: indices in __comps__ and _components correspond to each other
                        console.log(`[ComponentTools] Searching for component type: ${expectedComponentType}`);
                        
                        for (let i = 0; i < targetNodeData.__comps__.length; i++) {
                            const comp = targetNodeData.__comps__[i] as any;
                            console.log(`[ComponentTools] Checking component ${i}: type=${comp.type}, target=${expectedComponentType}`);
                            
                            if (comp.type === expectedComponentType) {
                                targetComponent = comp;
                                console.log(`[ComponentTools] Found matching component at index ${i}: ${comp.type}`);
                                
                                // Get component ID in scene from component's value.uuid.value
                                if (comp.value && comp.value.uuid && comp.value.uuid.value) {
                                    componentId = comp.value.uuid.value;
                                    console.log(`[ComponentTools] Got componentId from comp.value.uuid.value: ${componentId}`);
                                } else {
                                    console.log(`[ComponentTools] Component structure:`, {
                                        hasValue: !!comp.value,
                                        hasUuid: !!(comp.value && comp.value.uuid),
                                        hasUuidValue: !!(comp.value && comp.value.uuid && comp.value.uuid.value),
                                        uuidStructure: comp.value ? comp.value.uuid : 'No value'
                                    });
                                    throw new Error(`Unable to extract component ID from component structure`);
                                }
                                
                                break;
                            }
                        }
                        
                        if (!targetComponent) {
                            // If not found, list available components for user reference, showing real scene IDs
                            const availableComponents = targetNodeData.__comps__.map((comp: any, index: number) => {
                                let sceneId = 'unknown';
                                // Get scene ID from component's value.uuid.value
                                if (comp.value && comp.value.uuid && comp.value.uuid.value) {
                                    sceneId = comp.value.uuid.value;
                                }
                                return `${comp.type}(scene_id:${sceneId})`;
                            });
                            throw new Error(`Component type '${expectedComponentType}' not found on node ${targetNodeUuid}. Available components: ${availableComponents.join(', ')}`);
                        }
                        
                        console.log(`[ComponentTools] Found component ${expectedComponentType} with scene ID: ${componentId} on node ${targetNodeUuid}`);
                        
                        // Update expected value to actual component ID object format for subsequent verification
                        if (componentId) {
                            actualExpectedValue = { uuid: componentId };
                        }
                        
                        // Try using same format as node/asset references: {uuid: componentId}
                        // Test whether component reference can be set correctly
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: nodeUuid,
                            path: propertyPath,
                            dump: { 
                                value: { uuid: componentId },  // Use object format, like node/asset references
                                type: expectedComponentType
                            }
                        });
                        
                    } catch (error) {
                        console.error(`[ComponentTools] Error setting component reference:`, error);
                        throw error;
                    }
                } else if (propertyType === 'nodeArray' && Array.isArray(processedValue)) {
                    // Special handling for node arrays - preserve preprocessed format
                    console.log(`[ComponentTools] Setting node array:`, processedValue);
                    
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { 
                            value: processedValue  // Preserve [{uuid: "..."}, {uuid: "..."}] format
                        }
                    });
                } else if (propertyType === 'colorArray' && Array.isArray(processedValue)) {
                    // Special handling for color arrays
                    const colorArrayValue = processedValue.map((item: any) => {
                        if (item && typeof item === 'object' && 'r' in item) {
                            return {
                                r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                            };
                        } else {
                            return { r: 255, g: 255, b: 255, a: 255 };
                        }
                    });
                    
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { 
                            value: colorArrayValue,
                            type: 'cc.Color'
                        }
                    });
                } else {
                    // Normal property setting for non-asset properties
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { value: processedValue }
                    });
                }
                
                // Step 5: Wait for Editor to complete update, then verify setting result
                await new Promise(r => setTimeout(r, 200)); // Wait 200ms for Editor to complete update

                const verification = await this.verifyPropertyChange(nodeUuid, componentType, property, originalValue, actualExpectedValue);

                return {
                    success: true,
                    message: `Successfully set ${componentType}.${property}`,
                    data: {
                        nodeUuid,
                        componentType,
                        property,
                        actualValue: verification.actualValue,
                        changeVerified: verification.verified
                    }
                };

        } catch (error: any) {
            console.error(`[ComponentTools] Error setting property:`, error);
            return {
                success: false,
                error: `Failed to set property: ${error.message}`
            };
        }
    }


    private async getAvailableComponents(category: string = 'all'): Promise<ToolResponse> {
        const componentCategories: Record<string, string[]> = {
            renderer: ['cc.Sprite', 'cc.Label', 'cc.RichText', 'cc.Mask', 'cc.Graphics'],
            ui: ['cc.Button', 'cc.Toggle', 'cc.Slider', 'cc.ScrollView', 'cc.EditBox', 'cc.ProgressBar'],
            physics: ['cc.RigidBody2D', 'cc.BoxCollider2D', 'cc.CircleCollider2D', 'cc.PolygonCollider2D'],
            animation: ['cc.Animation', 'cc.AnimationClip', 'cc.SkeletalAnimation'],
            audio: ['cc.AudioSource'],
            layout: ['cc.Layout', 'cc.Widget', 'cc.PageView', 'cc.PageViewIndicator'],
            effects: ['cc.MotionStreak', 'cc.ParticleSystem2D'],
            camera: ['cc.Camera'],
            light: ['cc.Light', 'cc.DirectionalLight', 'cc.PointLight', 'cc.SpotLight']
        };

        let components: string[] = [];
        
        if (category === 'all') {
            for (const cat in componentCategories) {
                components = components.concat(componentCategories[cat]);
            }
        } else if (componentCategories[category]) {
            components = componentCategories[category];
        }

        return {
            success: true,
            data: {
                category: category,
                components: components
            }
        };
    }

    private isValidPropertyDescriptor(propData: any): boolean {
        // Check if it is a valid property descriptor object
        if (typeof propData !== 'object' || propData === null) {
            return false;
        }
        
        try {
            const keys = Object.keys(propData);
            
            // Avoid traversing simple numeric/primitive objects (e.g. {width: 200, height: 150})
            const isSimpleValueObject = keys.every(key => {
                const value = propData[key];
                return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
            });
            
            if (isSimpleValueObject) {
                return false;
            }
            
            // Check whether it contains characteristic fields of property descriptor, without using 'in' operator
            const hasName = keys.includes('name');
            const hasValue = keys.includes('value');
            const hasType = keys.includes('type');
            const hasDisplayName = keys.includes('displayName');
            const hasReadonly = keys.includes('readonly');
            
            // Must contain name or value field, and usually type field as well
            const hasValidStructure = (hasName || hasValue) && (hasType || hasDisplayName || hasReadonly);
            
            // Extra check: if default field exists and has complex structure, avoid deep traversal
            if (keys.includes('default') && propData.default && typeof propData.default === 'object') {
                const defaultKeys = Object.keys(propData.default);
                if (defaultKeys.includes('value') && typeof propData.default.value === 'object') {
                    // In this case, only return top-level properties, do not deeply traverse default.value
                    return hasValidStructure;
                }
            }
            
            return hasValidStructure;
        } catch (error) {
            console.warn(`[isValidPropertyDescriptor] Error checking property descriptor:`, error);
            return false;
        }
    }

    private analyzeProperty(component: any, propertyName: string): { exists: boolean; type: string; availableProperties: string[]; originalValue: any } {
        // Extract available properties from complex component structure
        const availableProperties: string[] = [];
        let propertyValue: any = undefined;
        let propertyExists = false;
        
        // Try multiple ways to look up properties:
        // 1. Direct property access
        if (Object.prototype.hasOwnProperty.call(component, propertyName)) {
            propertyValue = component[propertyName];
            propertyExists = true;
        }
        
        // 2. Look up from nested structure (such as complex structures seen in test data)
        if (!propertyExists && component.properties && typeof component.properties === 'object') {
            // First check if properties.value exists (this is the structure seen in getComponents)
            if (component.properties.value && typeof component.properties.value === 'object') {
                const valueObj = component.properties.value;
                for (const [key, propData] of Object.entries(valueObj)) {
                    // Check if propData is a valid property descriptor object
                    // Ensure propData is an object and contains expected property structure
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData as any;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // Prioritize value property; if not present, use propData itself
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            } catch (error) {
                                // If check fails, use propInfo directly
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            } else {
                // Fallback: look up directly from properties
                for (const [key, propData] of Object.entries(component.properties)) {
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData as any;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // Prioritize value property; if not present, use propData itself
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            } catch (error) {
                                // If check fails, use propInfo directly
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            }
        }
        
        // 3. Extract simple property names from direct properties
        if (availableProperties.length === 0) {
            for (const key of Object.keys(component)) {
                if (!key.startsWith('_') && !['__type__', 'cid', 'node', 'uuid', 'name', 'enabled', 'type', 'readonly', 'visible'].includes(key)) {
                    availableProperties.push(key);
                }
            }
        }
        
        if (!propertyExists) {
            return {
                exists: false,
                type: 'unknown',
                availableProperties,
                originalValue: undefined
            };
        }
        
        let type = 'unknown';
        
        // Smart type detection
        if (Array.isArray(propertyValue)) {
            // Array type detection
            if (propertyName.toLowerCase().includes('node')) {
                type = 'nodeArray';
            } else if (propertyName.toLowerCase().includes('color')) {
                type = 'colorArray';
            } else {
                type = 'array';
            }
        } else if (typeof propertyValue === 'string') {
            // Check if property name suggests it's an asset
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            } else {
                type = 'string';
            }
        } else if (typeof propertyValue === 'number') {
            type = 'number';
        } else if (typeof propertyValue === 'boolean') {
            type = 'boolean';
        } else if (propertyValue && typeof propertyValue === 'object') {
            try {
                const keys = Object.keys(propertyValue);
                if (keys.includes('r') && keys.includes('g') && keys.includes('b')) {
                    type = 'color';
                } else if (keys.includes('x') && keys.includes('y')) {
                    type = propertyValue.z !== undefined ? 'vec3' : 'vec2';
                } else if (keys.includes('width') && keys.includes('height')) {
                    type = 'size';
                } else if (keys.includes('uuid') || keys.includes('__uuid__')) {
                    // Check if it is a node reference (determined by property name or __id__ property)
                    if (propertyName.toLowerCase().includes('node') || 
                        propertyName.toLowerCase().includes('target') ||
                        keys.includes('__id__')) {
                        type = 'node';
                    } else {
                        type = 'asset';
                    }
                } else if (keys.includes('__id__')) {
                    // Node reference characteristic
                    type = 'node';
                } else {
                    type = 'object';
                }
            } catch (error) {
                console.warn(`[analyzeProperty] Error checking property type for: ${JSON.stringify(propertyValue)}`);
                type = 'object';
            }
        } else if (propertyValue === null || propertyValue === undefined) {
            // For null/undefined values, check property name to determine type
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            } else if (propertyName.toLowerCase().includes('node') || 
                      propertyName.toLowerCase().includes('target')) {
                type = 'node';
            } else if (propertyName.toLowerCase().includes('component')) {
                type = 'component';
            } else {
                type = 'unknown';
            }
        }
        
        return {
            exists: true,
            type,
            availableProperties,
            originalValue: propertyValue
        };
    }

    /**
     * Automatically detect property type
     */
    private autoDetectPropertyType(propertyName: string, value: any, originalValue: any, detectedType: string): string {
        // 1. Heuristic detection based on property name
        const nameLower = propertyName.toLowerCase();
        
        // Asset type detection
        if (nameLower.includes('prefab')) return 'prefab';
        if (nameLower.includes('spriteframe') || nameLower.includes('sprite_frame')) return 'spriteFrame';
        if (nameLower.includes('material')) return 'asset';
        if (nameLower.includes('texture') || nameLower.includes('font') || nameLower.includes('clip')) return 'asset';
        
        // Node reference detection
        if (nameLower.includes('node') || nameLower.includes('target') || nameLower.includes('player') || 
            nameLower.includes('enemy') || nameLower.includes('bullet') || nameLower.includes('ui') ||
            nameLower.includes('layer') || nameLower.includes('canvas')) return 'node';
        
        // Component reference detection
        if (nameLower.includes('component')) return 'component';
        
        // 2. Value type based detection
        if (typeof value === 'string') {
            // UUID format detection
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                // Long UUID is usually an asset reference
                return 'asset';
            }
            // Hexadecimal color detection
            if (/^#[0-9a-f]{6}$/i.test(value)) {
                return 'color';
            }
            return 'string';
        }
        
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        
        // Object type detection
        if (typeof value === 'object' && value !== null) {
            // Color object detection
            if ('r' in value && 'g' in value && 'b' in value) return 'color';
            // Vec2 detection
            if ('x' in value && 'y' in value && !('z' in value)) return 'vec2';
            // Vec3 detection
            if ('x' in value && 'y' in value && 'z' in value) return 'vec3';
            // Size detection
            if ('width' in value && 'height' in value) return 'size';
            // UUID object detection (asset reference)
            if ('uuid' in value) return 'asset';
        }
        
        // Array type detection
        if (Array.isArray(value)) {
            if (value.length > 0) {
                const firstItem = value[0];
                if (typeof firstItem === 'string') return 'stringArray';
                if (typeof firstItem === 'number') return 'numberArray';
                if (typeof firstItem === 'object' && firstItem !== null) {
                    if ('r' in firstItem && 'g' in firstItem && 'b' in firstItem) return 'colorArray';
                    if ('uuid' in firstItem) return 'nodeArray';
                }
            }
            return 'stringArray'; // Default string array
        }
        
        // 3. Fallback detection based on original value
        if (originalValue !== undefined && originalValue !== null) {
            if (typeof originalValue === 'object' && 'r' in originalValue) return 'color';
            if (typeof originalValue === 'object' && 'x' in originalValue && 'y' in originalValue) {
                return 'z' in originalValue ? 'vec3' : 'vec2';
            }
            if (typeof originalValue === 'object' && 'width' in originalValue) return 'size';
        }
        
        // 4. Use detected type as fallback
        if (detectedType && detectedType !== 'unknown') return detectedType;
        
        // 5. Final fallback to primitive type
        return 'string';
    }

    private smartConvertValue(inputValue: any, propertyInfo: any): any {
        const { type, originalValue } = propertyInfo;
        
        console.log(`[smartConvertValue] Converting ${JSON.stringify(inputValue)} to type: ${type}`);
        
        switch (type) {
            case 'string':
                return String(inputValue);
                
            case 'number':
                return Number(inputValue);
                
            case 'boolean':
                if (typeof inputValue === 'boolean') return inputValue;
                if (typeof inputValue === 'string') {
                    return inputValue.toLowerCase() === 'true' || inputValue === '1';
                }
                return Boolean(inputValue);
                
            case 'color':
                // Optimized color handling, supports multiple input formats
                if (typeof inputValue === 'string') {
                    // String format: hexadecimal, color name, rgb()/rgba()
                    return this.parseColorString(inputValue);
                } else if (typeof inputValue === 'object' && inputValue !== null) {
                    try {
                        const inputKeys = Object.keys(inputValue);
                        // If input is color object, validate and convert
                        if (inputKeys.includes('r') || inputKeys.includes('g') || inputKeys.includes('b')) {
                            return {
                                r: Math.min(255, Math.max(0, Number(inputValue.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(inputValue.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(inputValue.b) || 0)),
                                a: inputValue.a !== undefined ? Math.min(255, Math.max(0, Number(inputValue.a))) : 255
                            };
                        }
                    } catch (error) {
                        console.warn(`[smartConvertValue] Invalid color object: ${JSON.stringify(inputValue)}`);
                    }
                }
                // If original value exists, preserve structure and update provided values
                if (originalValue && typeof originalValue === 'object') {
                    try {
                        const inputKeys = typeof inputValue === 'object' && inputValue ? Object.keys(inputValue) : [];
                        return {
                            r: inputKeys.includes('r') ? Math.min(255, Math.max(0, Number(inputValue.r))) : (originalValue.r || 255),
                            g: inputKeys.includes('g') ? Math.min(255, Math.max(0, Number(inputValue.g))) : (originalValue.g || 255),
                            b: inputKeys.includes('b') ? Math.min(255, Math.max(0, Number(inputValue.b))) : (originalValue.b || 255),
                            a: inputKeys.includes('a') ? Math.min(255, Math.max(0, Number(inputValue.a))) : (originalValue.a || 255)
                        };
                    } catch (error) {
                        console.warn(`[smartConvertValue] Error processing color with original value: ${error}`);
                    }
                }
                // Return white by default
                console.warn(`[smartConvertValue] Using default white color for invalid input: ${JSON.stringify(inputValue)}`);
                return { r: 255, g: 255, b: 255, a: 255 };
                
            case 'vec2':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        x: Number(inputValue.x) || originalValue.x || 0,
                        y: Number(inputValue.y) || originalValue.y || 0
                    };
                }
                return originalValue;
                
            case 'vec3':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        x: Number(inputValue.x) || originalValue.x || 0,
                        y: Number(inputValue.y) || originalValue.y || 0,
                        z: Number(inputValue.z) || originalValue.z || 0
                    };
                }
                return originalValue;
                
            case 'size':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        width: Number(inputValue.width) || originalValue.width || 100,
                        height: Number(inputValue.height) || originalValue.height || 100
                    };
                }
                return originalValue;
                
            case 'node':
                if (typeof inputValue === 'string') {
                    // Node reference requires special handling
                    return inputValue;
                } else if (typeof inputValue === 'object' && inputValue !== null) {
                    // If already in object form, return UUID or full object
                    return inputValue.uuid || inputValue;
                }
                return originalValue;
                
            case 'asset':
                if (typeof inputValue === 'string') {
                    // If input is string path, convert to asset object
                    return { uuid: inputValue };
                } else if (typeof inputValue === 'object' && inputValue !== null) {
                    return inputValue;
                }
                return originalValue;
                
            default:
                // For unknown types, preserve original structure as much as possible
                if (typeof inputValue === typeof originalValue) {
                    return inputValue;
                }
                return originalValue;
        }
    }

        private parseColorString(colorStr: string): { r: number; g: number; b: number; a: number } {
        const str = colorStr.trim();
        
        // Only hexadecimal format #RRGGBB or #RRGGBBAA is supported
        if (str.startsWith('#')) {
            if (str.length === 7) { // #RRGGBB
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                return { r, g, b, a: 255 };
            } else if (str.length === 9) { // #RRGGBBAA
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                const a = parseInt(str.substring(7, 9), 16);
                return { r, g, b, a };
            }
        }
        
        // If not valid hexadecimal format, return error prompt
        throw new Error(`Invalid color format: "${colorStr}". Only hexadecimal format is supported (e.g., "#FF0000" or "#FF0000FF")`);
    }

    private async verifyPropertyChange(nodeUuid: string, componentType: string, property: string, originalValue: any, expectedValue: any): Promise<{ verified: boolean; actualValue: any; fullData: any }> {
        console.log(`[verifyPropertyChange] Starting verification for ${componentType}.${property}`);
        console.log(`[verifyPropertyChange] Expected value:`, JSON.stringify(expectedValue));
        console.log(`[verifyPropertyChange] Original value:`, JSON.stringify(originalValue));
        
        try {
            // Re-fetch component info for verification
            console.log(`[verifyPropertyChange] Calling getComponentInfo...`);
            const componentInfo = await this.getComponentInfo(nodeUuid, componentType);
            console.log(`[verifyPropertyChange] getComponentInfo success:`, componentInfo.success);
            
            const allComponents = await this.getComponents(nodeUuid);
            console.log(`[verifyPropertyChange] getComponents success:`, allComponents.success);
            
            if (componentInfo.success && componentInfo.data) {
                console.log(`[verifyPropertyChange] Component data available, extracting property '${property}'`);
                const allPropertyNames = Object.keys(componentInfo.data.properties || {});
                console.log(`[verifyPropertyChange] Available properties:`, allPropertyNames);
                const propertyData = componentInfo.data.properties?.[property];
                console.log(`[verifyPropertyChange] Raw property data for '${property}':`, JSON.stringify(propertyData));
                
                // Extract actual value from property data
                let actualValue = propertyData;
                console.log(`[verifyPropertyChange] Initial actualValue:`, JSON.stringify(actualValue));
                
                if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                    actualValue = propertyData.value;
                    console.log(`[verifyPropertyChange] Extracted actualValue from .value:`, JSON.stringify(actualValue));
                } else {
                    console.log(`[verifyPropertyChange] No .value property found, using raw data`);
                }
                
                // Fixed verification logic: check whether actual value matches expected value
                let verified = false;
                
                if (typeof expectedValue === 'object' && expectedValue !== null && 'uuid' in expectedValue) {
                    // For reference types (node/component/asset), compare UUID
                    const actualUuid = actualValue && typeof actualValue === 'object' && 'uuid' in actualValue ? actualValue.uuid : '';
                    const expectedUuid = expectedValue.uuid || '';
                    verified = actualUuid === expectedUuid && expectedUuid !== '';
                    
                    console.log(`[verifyPropertyChange] Reference comparison:`);
                    console.log(`  - Expected UUID: "${expectedUuid}"`);
                    console.log(`  - Actual UUID: "${actualUuid}"`);
                    console.log(`  - UUID match: ${actualUuid === expectedUuid}`);
                    console.log(`  - UUID not empty: ${expectedUuid !== ''}`);
                    console.log(`  - Final verified: ${verified}`);
                } else {
                    // For other types, compare values directly
                    console.log(`[verifyPropertyChange] Value comparison:`);
                    console.log(`  - Expected type: ${typeof expectedValue}`);
                    console.log(`  - Actual type: ${typeof actualValue}`);
                    
                    if (typeof actualValue === typeof expectedValue) {
                        if (typeof actualValue === 'object' && actualValue !== null && expectedValue !== null) {
                            // Deep comparison for object types
                            verified = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
                            console.log(`  - Object comparison (JSON): ${verified}`);
                        } else {
                            // Direct comparison for primitive types
                            verified = actualValue === expectedValue;
                            console.log(`  - Direct comparison: ${verified}`);
                        }
                    } else {
                        // Special handling when types mismatch (such as number and string)
                        const stringMatch = String(actualValue) === String(expectedValue);
                        const numberMatch = Number(actualValue) === Number(expectedValue);
                        verified = stringMatch || numberMatch;
                        console.log(`  - String match: ${stringMatch}`);
                        console.log(`  - Number match: ${numberMatch}`);
                        console.log(`  - Type mismatch verified: ${verified}`);
                    }
                }
                
                console.log(`[verifyPropertyChange] Final verification result: ${verified}`);
                console.log(`[verifyPropertyChange] Final actualValue:`, JSON.stringify(actualValue));
                
                const result = {
                    verified,
                    actualValue,
                    fullData: {
                        // Only return modified property info, not full component data
                        modifiedProperty: {
                            name: property,
                            before: originalValue,
                            expected: expectedValue,
                            actual: actualValue,
                            verified,
                            propertyMetadata: propertyData // Only contains metadata for this property
                        },
                        // Simplified component info
                        componentSummary: {
                            nodeUuid,
                            componentType,
                            totalProperties: Object.keys(componentInfo.data?.properties || {}).length
                        }
                    }
                };
                
                console.log(`[verifyPropertyChange] Returning result:`, JSON.stringify(result, null, 2));
                return result;
            } else {
                console.log(`[verifyPropertyChange] ComponentInfo failed or no data:`, componentInfo);
            }
        } catch (error) {
            console.error('[verifyPropertyChange] Verification failed with error:', error);
            console.error('[verifyPropertyChange] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        }
        
        console.log(`[verifyPropertyChange] Returning fallback result`);
        return {
            verified: false,
            actualValue: undefined,
            fullData: null
        };
    }

    /**
     * Detect whether it is a node property, redirect to corresponding node method if so
     */
    private async checkAndRedirectNodeProperties(args: any): Promise<ToolResponse | null> {
        const { nodeUuid, componentType, property, propertyType, value } = args;
        
        // Detect whether it is a node basic property (should use set_node_property)
        const nodeBasicProperties = [
            'name', 'active', 'layer', 'mobility', 'parent', 'children', 'hideFlags'
        ];
        
        // Detect whether it is a node transform property (should use set_node_transform)
        const nodeTransformProperties = [
            'position', 'rotation', 'scale', 'eulerAngles', 'angle'
        ];
        
        // Detect attempts to set cc.Node properties (common mistake)
        if (componentType === 'cc.Node' || componentType === 'Node') {
            if (nodeBasicProperties.includes(property)) {
                return {
                    success: false,
                                          error: `Property '${property}' is a node basic property, not a component property`,
                      instruction: `Please use set_node_property method to set node properties: set_node_property(uuid="${nodeUuid}", property="${property}", value=${JSON.stringify(value)})`
                  };
              } else if (nodeTransformProperties.includes(property)) {
                  return {
                      success: false,
                      error: `Property '${property}' is a node transform property, not a component property`,
                      instruction: `Please use set_node_transform method to set transform properties: set_node_transform(uuid="${nodeUuid}", ${property}=${JSON.stringify(value)})`
                  };
              }
          }
          
          // Detect common incorrect usage
          if (nodeBasicProperties.includes(property) || nodeTransformProperties.includes(property)) {
              const methodName = nodeTransformProperties.includes(property) ? 'set_node_transform' : 'set_node_property';
              return {
                  success: false,
                  error: `Property '${property}' is a node property, not a component property`,
                  instruction: `Property '${property}' should be set using ${methodName} method, not set_component_property. Please use: ${methodName}(uuid="${nodeUuid}", ${nodeTransformProperties.includes(property) ? property : `property="${property}"`}=${JSON.stringify(value)})`
              };
          }
          
          return null; // Not a node property, proceed with normal processing
      }

      /**
       * Generate component suggestion info
       */
      private generateComponentSuggestion(requestedType: string, availableTypes: string[], property: string): string {
          // Check if similar component types exist
          const similarTypes = availableTypes.filter(type => 
              type.toLowerCase().includes(requestedType.toLowerCase()) || 
              requestedType.toLowerCase().includes(type.toLowerCase())
          );
          
          let instruction = '';
          
          if (similarTypes.length > 0) {
              instruction += `\n\n🔍 Found similar components: ${similarTypes.join(', ')}`;
              instruction += `\n💡 Suggestion: Perhaps you meant to set the '${similarTypes[0]}' component?`;
          }
          
          // Recommend possible components based on property name
          const propertyToComponentMap: Record<string, string[]> = {
              'string': ['cc.Label', 'cc.RichText', 'cc.EditBox'],
              'text': ['cc.Label', 'cc.RichText'],
              'fontSize': ['cc.Label', 'cc.RichText'],
              'spriteFrame': ['cc.Sprite'],
              'color': ['cc.Label', 'cc.Sprite', 'cc.Graphics'],
              'normalColor': ['cc.Button'],
              'pressedColor': ['cc.Button'],
              'target': ['cc.Button'],
              'contentSize': ['cc.UITransform'],
              'anchorPoint': ['cc.UITransform']
          };
          
          const recommendedComponents = propertyToComponentMap[property] || [];
          const availableRecommended = recommendedComponents.filter(comp => availableTypes.includes(comp));
          
          if (availableRecommended.length > 0) {
              instruction += `\n\n🎯 Based on property '${property}', recommended components: ${availableRecommended.join(', ')}`;
          }
          
          // Provide operation suggestions
          instruction += `\n\n📋 Suggested Actions:`;
          instruction += `\n1. Use get_components(nodeUuid="${requestedType.includes('uuid') ? 'YOUR_NODE_UUID' : 'nodeUuid'}") to view all components on the node`;
          instruction += `\n2. If you need to add a component, use add_component(nodeUuid="...", componentType="${requestedType}")`;
          instruction += `\n3. Verify that the component type name is correct (case-sensitive)`;
          
                  return instruction;
    }

    /**
     * Quickly verify asset setting result
     */
    private async quickVerifyAsset(nodeUuid: string, componentType: string, property: string): Promise<any> {
        try {
            const rawNodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!rawNodeData || !rawNodeData.__comps__) {
                return null;
            }
            
            // Find component
            const component = rawNodeData.__comps__.find((comp: any) => {
                const compType = comp.__type__ || comp.cid || comp.type;
                return compType === componentType;
            });
            
            if (!component) {
                return null;
            }
            
            // Extract property value
            const properties = this.extractComponentProperties(component);
            const propertyData = properties[property];
            
            if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                return propertyData.value;
            } else {
                return propertyData;
            }
        } catch (error) {
            console.error(`[quickVerifyAsset] Error:`, error);
            return null;
        }
    }

    /**
     * Configure button click events - unified interface supporting add, remove, and clear operations
     */
    private async configureClickEvent(args: any): Promise<ToolResponse> {
        try {
            const { nodeUuid, operation = 'add', targetNodeUuid, componentName, handlerName, customEventData, eventIndex } = args;

            // Re-fetch latest component state to ensure data synchronization
            const refreshedComponents = await this.getComponents(nodeUuid);
            if (!refreshedComponents.success || !refreshedComponents.data?.components) {
                return { success: false, error: 'Button node not found or has no components' };
            }

            const buttonComponent = refreshedComponents.data.components.find((comp: any) => comp.type === 'cc.Button');
            if (!buttonComponent) {
                return { success: false, error: 'Node does not have a Button component' };
            }

            // Get current clickEvents array to ensure using latest data
            let currentClickEvents: any[] = [];
            if (buttonComponent.properties.clickEvents && buttonComponent.properties.clickEvents.value) {
                currentClickEvents = Array.isArray(buttonComponent.properties.clickEvents.value)
                    ? buttonComponent.properties.clickEvents.value
                    : [];
            }

            console.log(`Current clickEvents count: ${currentClickEvents.length}, operation: ${operation}`);

            const previousEventCount = currentClickEvents.length;
            let updatedClickEvents: any[] = [];
            let message = '';

            switch (operation) {
                case 'modify':
                    // Modify existing event
                    if (eventIndex === undefined || eventIndex < 0 || eventIndex >= currentClickEvents.length) {
                        return {
                            success: false,
                            error: `Invalid event index ${eventIndex}. Available indices: 0-${currentClickEvents.length - 1}`
                        };
                    }

                    // Optimize based on editor behavior: deep copy event data to avoid directly mutating reference
                    updatedClickEvents = [...currentClickEvents];
                    // Deep copy event to modify, avoiding modifying original data
                    const existingEvent = JSON.parse(JSON.stringify(currentClickEvents[eventIndex]));

                    // If target node or component needs to be modified, full verification is required
                    if (targetNodeUuid !== undefined || componentName !== undefined) {
                        // Determine node and component to verify
                        const nodeToVerify = targetNodeUuid || existingEvent.value.target.value.uuid;
                        const compToVerify = componentName || existingEvent.value._componentId.value;

                        // 1. First verify if node exists
                        if (targetNodeUuid !== undefined) {
                            const verifyNodeComponents = await this.getComponents(targetNodeUuid);
                            if (!verifyNodeComponents.success || !verifyNodeComponents.data?.components) {
                                return {
                                    success: false,
                                    error: `Target node '${targetNodeUuid}' not found or has no components`
                                };
                            }

                            // 2. If modifying component as well, verify if component exists
                            if (componentName !== undefined) {
                                const verifyTargetComponent = verifyNodeComponents.data.components.find((comp: any) =>
                                    comp.type === componentName ||
                                    (comp.properties && comp.properties._name && comp.properties._name.value === componentName)
                                );

                                if (!verifyTargetComponent) {
                                    return {
                                        success: false,
                                        error: `Component '${componentName}' not found on target node. Available components: ${verifyNodeComponents.data.components.map((c: any) => c.type).join(', ')}`
                                    };
                                }
                            }
                        }

                        // 3. Verify if handler method exists
                        if (handlerName !== undefined && nodeToVerify && compToVerify) {
                            try {
                                console.log(`Verifying handler '${handlerName}' on node ${nodeToVerify}, component ${compToVerify}`);
                                const componentFunctions = await Editor.Message.request('scene', 'query-component-function-of-node', nodeToVerify);
                                console.log('Component functions for modify:', componentFunctions);

                                let handlerFound = false;
                                if (componentFunctions && Array.isArray(componentFunctions)) {
                                    for (const compFuncs of componentFunctions) {
                                        if (compFuncs.component === compToVerify || compFuncs.name === compToVerify) {
                                            if (compFuncs.functions && Array.isArray(compFuncs.functions)) {
                                                handlerFound = compFuncs.functions.some((func: any) =>
                                                    func === handlerName ||
                                                    (typeof func === 'object' && func.name === handlerName)
                                                );
                                                if (handlerFound) break;
                                            }
                                        }
                                    }
                                } else if (componentFunctions && typeof componentFunctions === 'object' && componentFunctions[compToVerify]) {
                                    const funcs = componentFunctions[compToVerify];
                                    if (Array.isArray(funcs)) {
                                        handlerFound = funcs.includes(handlerName);
                                    } else if (funcs.functions && Array.isArray(funcs.functions)) {
                                        handlerFound = funcs.functions.includes(handlerName);
                                    }
                                }

                                if (!handlerFound) {
                                    console.warn(`Handler '${handlerName}' not found in component '${compToVerify}' on node ${nodeToVerify}. This might be a custom method.`);
                                    // Do not block operation, as it might be a custom method
                                }
                            } catch (err) {
                                console.error('Failed to verify handler for modify operation:', err);
                                // Query failure should not block operation
                            }
                        }
                    }

                    // Update specified properties
                    if (targetNodeUuid !== undefined) {
                        existingEvent.value.target.value.uuid = targetNodeUuid;
                    }
                    if (componentName !== undefined) {
                        existingEvent.value._componentId.value = componentName;
                    }
                    if (handlerName !== undefined) {
                        existingEvent.value.handler.value = handlerName;
                    }
                    if (customEventData !== undefined) {
                        existingEvent.value.customEventData.value = customEventData;
                    }

                    // Put modified event back into array
                    updatedClickEvents[eventIndex] = existingEvent;
                    message = `Click event at index ${eventIndex} modified successfully`;
                    break;

                case 'add':
                    // Verify whether target node and component exist
                    const targetComponents = await this.getComponents(targetNodeUuid);
                    if (!targetComponents.success || !targetComponents.data?.components) {
                        return { success: false, error: 'Target node not found or has no components' };
                    }

                    const targetComponent = targetComponents.data.components.find((comp: any) =>
                        comp.type === componentName ||
                        (comp.properties && comp.properties._name && comp.properties._name.value === componentName)
                    );

                    if (!targetComponent) {
                        return {
                            success: false,
                            error: `Component '${componentName}' not found on target node. Available components: ${targetComponents.data.components.map((c: any) => c.type).join(', ')}`
                        };
                    }

                    // Verify whether handler method exists in target component
                    if (handlerName) {
                        try {
                            console.log(`Querying component functions for node: ${targetNodeUuid}`);
                            const componentFunctions = await Editor.Message.request('scene', 'query-component-function-of-node', targetNodeUuid);
                            console.log('Component functions result:', componentFunctions);

                            // Check if returned function list contains specified handler
                            let handlerFound = false;
                            if (componentFunctions && Array.isArray(componentFunctions)) {
                                // Traverse functions of all components
                                for (const compFuncs of componentFunctions) {
                                    if (compFuncs.component === componentName || compFuncs.name === componentName) {
                                        // Check function list of this component
                                        if (compFuncs.functions && Array.isArray(compFuncs.functions)) {
                                            handlerFound = compFuncs.functions.some((func: any) =>
                                                func === handlerName ||
                                                (typeof func === 'object' && func.name === handlerName)
                                            );
                                            if (handlerFound) break;
                                        }
                                    }
                                }
                            } else if (componentFunctions && typeof componentFunctions === 'object') {
                                // May return object format
                                if (componentFunctions[componentName]) {
                                    const funcs = componentFunctions[componentName];
                                    if (Array.isArray(funcs)) {
                                        handlerFound = funcs.includes(handlerName);
                                    } else if (funcs.functions && Array.isArray(funcs.functions)) {
                                        handlerFound = funcs.functions.includes(handlerName);
                                    }
                                }
                            }

                            if (!handlerFound) {
                                console.warn(`Handler '${handlerName}' not found in component '${componentName}' functions. This might be a custom method or the query failed.`);
                                // Do not fail directly, as it might be a custom method or query failure
                                // Just log a warning and let operation continue
                            }
                        } catch (err) {
                            console.error('Failed to query component functions:', err);
                            // Query failure should not block operation, just log error
                        }
                    }

                    // Build click event configuration conforming to Cocos Creator editor format
                    // Based on actual event structure analysis, use complete nested format
                    const clickEventData = {
                        value: {
                            target: {
                                name: "target",
                                value: { uuid: targetNodeUuid },
                                default: null,
                                type: "cc.Node",
                                readonly: false,
                                visible: true,
                                animatable: true,
                                tooltip: "i18n:ENGINE.button.click_event.target",
                                displayName: "i18n:ENGINE.classes.cc.ClickEvent.properties.target.displayName",
                                extends: ["cc.Object"]
                            },
                            component: {
                                name: "component",
                                value: "",
                                default: "",
                                type: "String",
                                readonly: false,
                                visible: true,
                                animatable: true,
                                tooltip: "i18n:ENGINE.button.click_event.component",
                                displayName: "i18n:ENGINE.classes.cc.ClickEvent.properties.component.displayName",
                                extends: []
                            },
                            _componentId: {
                                name: "_componentId",
                                value: componentName,
                                default: "",
                                type: "String",
                                readonly: false,
                                visible: false,
                                animatable: true,
                                displayName: "i18n:ENGINE.classes.cc.ClickEvent.properties._componentId.displayName",
                                tooltip: "i18n:ENGINE.classes.cc.ClickEvent.properties._componentId.tooltip",
                                extends: []
                            },
                            handler: {
                                name: "handler",
                                value: handlerName,
                                default: "",
                                type: "String",
                                readonly: false,
                                visible: true,
                                animatable: true,
                                tooltip: "i18n:ENGINE.button.click_event.handler",
                                displayName: "i18n:ENGINE.classes.cc.ClickEvent.properties.handler.displayName",
                                extends: []
                            },
                            customEventData: {
                                name: "customEventData",
                                value: customEventData || "",
                                default: "",
                                type: "String",
                                readonly: false,
                                visible: true,
                                animatable: true,
                                tooltip: "i18n:ENGINE.button.click_event.customEventData",
                                displayName: "i18n:ENGINE.classes.cc.ClickEvent.properties.customEventData.displayName",
                                extends: []
                            }
                        },
                        default: {
                            type: "cc.ClickEvent",
                            value: {
                                target: {
                                    name: "target",
                                    value: { uuid: "" },
                                    default: null,
                                    type: "cc.Node",
                                    readonly: false,
                                    visible: true,
                                    animatable: true,
                                    tooltip: "i18n:ENGINE.button.click_event.target",
                                    displayName: "i18n:ENGINE.classes.cc.ClickEvent.properties.target.displayName",
                                    extends: ["cc.Object"]
                                },
                                component: {
                                    name: "component",
                                    value: "",
                                    default: "",
                                    type: "String",
                                    readonly: false,
                                    visible: true,
                                    animatable: true,
                                    tooltip: "i18n:ENGINE.button.click_event.component",
                                    displayName: "i18n:ENGINE.classes.cc.ClickEvent.properties.component.displayName",
                                    extends: []
                                },
                                _componentId: {
                                    name: "_componentId",
                                    value: "",
                                    default: "",

                                    type: "String",
                                    readonly: false,
                                    visible: false,
                                    animatable: true,
                                    displayName: "i18n:ENGINE.classes.cc.ClickEvent.properties._componentId.displayName",
                                    tooltip: "i18n:ENGINE.classes.cc.ClickEvent.properties._componentId.tooltip",
                                    extends: []
                                },
                                handler: {
                                    name: "handler",
                                    value: "",
                                    default: "",
                                    type: "String",
                                    readonly: false,
                                    visible: true,
                                    animatable: true,
                                    tooltip: "i18n:ENGINE.button.click_event.handler",
                                    displayName: "i18n:ENGINE.classes.cc.ClickEvent.properties.handler.displayName",
                                    extends: []
                                },
                                customEventData: {
                                    name: "customEventData",
                                    value: "",
                                    default: "",
                                    type: "String",
                                    readonly: false,
                                    visible: true,
                                    animatable: true,
                                    tooltip: "i18n:ENGINE.button.click_event.customEventData",
                                    displayName: "i18n:ENGINE.classes.cc.ClickEvent.properties.customEventData.displayName",
                                    extends: []
                                }
                            }
                        },
                        type: "cc.ClickEvent",
                        readonly: false,
                        visible: true,
                        animatable: true,
                        tooltip: "i18n:ENGINE.button.click_events",
                        displayOrder: 20,
                        extends: []
                    };

                    updatedClickEvents = [...currentClickEvents, clickEventData];
                    message = `Click event added successfully: ${targetNodeUuid}.${componentName}.${handlerName}()`;
                    break;

                case 'remove':
                    if (eventIndex === undefined || eventIndex < 0 || eventIndex >= currentClickEvents.length) {
                        return {
                            success: false,
                            error: `Invalid event index ${eventIndex}. Available indices: 0-${currentClickEvents.length - 1}`
                        };
                    }

                    updatedClickEvents = currentClickEvents.filter((_, index) => index !== eventIndex);
                    message = `Click event at index ${eventIndex} removed successfully`;
                    break;

                case 'clear':
                    updatedClickEvents = [];
                    message = `All click events cleared successfully (removed ${currentClickEvents.length} events)`;
                    break;

                default:
                    return { success: false, error: `Unknown operation: ${operation}` };
            }

            // Use Editor's set-property message to set clickEvents
            // Find index of Button component in components array
            const buttonIndex = refreshedComponents.data.components.findIndex((comp: any) => comp.type === 'cc.Button');

            if (buttonIndex === -1) {
                return { success: false, error: 'Button component index not found' };
            }

            console.log(`Setting clickEvents for Button at index ${buttonIndex}, operation: ${operation}`);
            console.log(`Previous event count: ${previousEventCount}, New event count: ${updatedClickEvents.length}`);

            // Use correct editor API format, based on engine source code analysis results
            try {
                const result = await Editor.Message.request('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: `__comps__.${buttonIndex}.clickEvents`,
                    dump: {
                        type: 'cc.ClickEvent',
                        isArray: true,
                        value: updatedClickEvents
                    }
                });
                console.log('set-property result:', result);

                // Wait a short time for Editor to complete update
                await new Promise(r => setTimeout(r, 300));

                // Re-fetch component state to verify if modification succeeded
                const verifyComponents = await this.getComponents(nodeUuid);
                if (!verifyComponents.success || !verifyComponents.data?.components) {
                    return {
                        success: false,
                        error: 'Failed to verify click event changes - cannot retrieve component data'
                    };
                }

                const verifyButton = verifyComponents.data.components.find((comp: any) => comp.type === 'cc.Button');
                if (!verifyButton) {
                    return {
                        success: false,
                        error: 'Failed to verify click event changes - Button component not found'
                    };
                }

                // Get updated clickEvents
                let verifiedClickEvents: any[] = [];
                if (verifyButton.properties.clickEvents && verifyButton.properties.clickEvents.value) {
                    verifiedClickEvents = Array.isArray(verifyButton.properties.clickEvents.value)
                        ? verifyButton.properties.clickEvents.value
                        : [];
                }

                const verifiedEventCount = verifiedClickEvents.length;
                console.log(`Verification - Expected event count: ${updatedClickEvents.length}, Actual event count: ${verifiedEventCount}`);

                // Verify if event count is correct
                let verificationSuccess = false;
                switch (operation) {
                    case 'add':
                        verificationSuccess = verifiedEventCount === previousEventCount + 1;
                        break;
                    case 'remove':
                        verificationSuccess = verifiedEventCount === previousEventCount - 1;
                        break;
                    case 'clear':
                        verificationSuccess = verifiedEventCount === 0;
                        break;
                    case 'modify':
                        verificationSuccess = verifiedEventCount === previousEventCount;
                        // For modify operation, also verify whether specific changes took effect
                        if (verificationSuccess && eventIndex !== undefined && verifiedClickEvents[eventIndex]) {
                            const modifiedEvent = verifiedClickEvents[eventIndex];
                            if (targetNodeUuid !== undefined && modifiedEvent.value.target.value.uuid !== targetNodeUuid) {
                                verificationSuccess = false;
                                console.log(`Modify verification failed: target UUID mismatch`);
                            }
                            if (componentName !== undefined && modifiedEvent.value._componentId.value !== componentName) {
                                verificationSuccess = false;
                                console.log(`Modify verification failed: component name mismatch`);
                            }
                            if (handlerName !== undefined && modifiedEvent.value.handler.value !== handlerName) {
                                verificationSuccess = false;
                                console.log(`Modify verification failed: handler name mismatch`);
                            }
                            if (customEventData !== undefined && modifiedEvent.value.customEventData.value !== customEventData) {
                                verificationSuccess = false;
                                console.log(`Modify verification failed: custom data mismatch`);
                            }
                        }
                        break;
                }

                if (verificationSuccess) {
                    return {
                        success: true,
                        message: message + ' (verified)',
                        data: {
                            nodeUuid,
                            operation,
                            previousEventCount: previousEventCount,
                            newEventCount: verifiedEventCount,
                            verified: true,
                            clickEvents: verifiedClickEvents
                        }
                    };
                } else {
                    return {
                        success: false,
                        error: `Click event ${operation} operation failed verification. Expected ${updatedClickEvents.length} events, but found ${verifiedEventCount} events.`,
                        data: {
                            nodeUuid,
                            operation,
                            expectedEventCount: updatedClickEvents.length,
                            actualEventCount: verifiedEventCount,
                            previousEventCount: previousEventCount
                        }
                    };
                }
            } catch (err: any) {
                return {
                    success: false,
                    error: `Editor API error: ${err.message}`
                };
            }

        } catch (err: any) {
            return {
                success: false,
                error: `Configuration error: ${err.message}`
            };
        }
    }

    private async updateComponent(args: any): Promise<ToolResponse> {
        try {
            const { nodeUuid, componentType, properties, autoSave } = args;
            if (!nodeUuid) return { success: false, error: 'nodeUuid is required' };
            if (!componentType) return { success: false, error: 'componentType is required' };
            if (!properties || typeof properties !== 'object') {
                return { success: false, error: 'properties object is required' };
            }

            const resolvedProperties = await AssetResolver.resolvePropertiesDeep(properties);

            const options = {
                name: SCENE_SCRIPT_TARGET,
                method: 'updateComponent',
                args: [nodeUuid, componentType, resolvedProperties]
            };

            const result: any = await Editor.Message.request('scene', 'execute-scene-script', options);

            if (result && result.success && autoSave) {
                try {
                    await Editor.Message.request('scene', 'save-scene');
                } catch (saveErr: any) {
                    console.warn('[ComponentTools] autoSave error:', saveErr);
                }
            }

            return result || { success: false, error: 'No response from scene script' };
        } catch (err: any) {
            console.error('[ComponentTools] updateComponent error:', err);
            return {
                success: false,
                error: `Failed to update component: ${err.message}`
            };
        }
    }

    private async queryClassInfo(args: any): Promise<ToolResponse> {
        try {
            const { className } = args;
            if (!className) return { success: false, error: 'className is required' };

            const options = {
                name: SCENE_SCRIPT_TARGET,
                method: 'getClassInfo',
                args: [className]
            };

            const result: any = await Editor.Message.request('scene', 'execute-scene-script', options);
            return result || { success: false, error: 'No response from scene script' };
        } catch (err: any) {
            return { success: false, error: `Failed to query class info: ${err.message}` };
        }
    }

    private async handleSpineSetup(args: any): Promise<ToolResponse> {
        try {
            const {
                nodeUuid,
                spineAssetPath,
                defaultAnimation,
                loop = true,
                componentType = 'FastSpine',
                autoSave = true
            } = args;

            if (!nodeUuid) {
                return { success: false, error: 'nodeUuid is required for spine_setup' };
            }
            if (!spineAssetPath) {
                return { success: false, error: 'spineAssetPath is required for spine_setup' };
            }

            // 1. Resolve spine asset to UUID
            const resolved = await AssetResolver.resolve(spineAssetPath);
            if (!resolved || !resolved.uuid) {
                return {
                    success: false,
                    error: `Could not resolve spine asset path: ${spineAssetPath}`
                };
            }
            const skeletonUuid = resolved.uuid;

            // 2. Check if component is already attached to node
            const compListRes = await this.getComponents(nodeUuid);
            const existingComps = (compListRes.success && compListRes.data && Array.isArray(compListRes.data.components))
                ? compListRes.data.components
                : [];

            const targetType = componentType === 'sp.Skeleton' ? 'sp.Skeleton' : 'FastSpine';
            const hasComp = existingComps.some((c: any) => c.type === targetType || c.type?.includes(targetType));

            // 3. Attach component if missing
            if (!hasComp) {
                const addRes = await this.addComponents(nodeUuid, targetType);
                if (!addRes.success) {
                    return {
                        success: false,
                        error: `Failed to attach ${targetType} to node ${nodeUuid}: ${addRes.error}`
                    };
                }
            }

            // 4. Update component properties
            const properties: Record<string, any> = {};
            if (targetType === 'FastSpine') {
                properties['fastSpineData'] = { __uuid__: skeletonUuid };
            } else {
                properties['skeletonData'] = { __uuid__: skeletonUuid };
            }

            if (defaultAnimation !== undefined && defaultAnimation !== null) {
                properties['defaultAnimation'] = defaultAnimation;
            }
            properties['loop'] = loop !== false;

            const updateRes = await this.updateComponent({
                nodeUuid,
                componentType: targetType,
                properties,
                autoSave
            });

            return {
                success: updateRes.success,
                message: updateRes.success
                    ? `✅ Spine setup successfully configured ${targetType} on node ${nodeUuid}`
                    : `Spine setup encountered an error updating properties: ${updateRes.error}`,
                data: {
                    nodeUuid,
                    componentType: targetType,
                    skeletonUuid,
                    properties,
                    updateResult: updateRes
                }
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Spine setup error: ${err.message || err}`
            };
        }
    }
}