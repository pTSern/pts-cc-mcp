import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { SCENE_SCRIPT_TARGET } from '../constants';
import { HeadlessEditTools, HeadlessChainOp } from './headless-edit-tools';

declare const Editor: any;

export interface UIElementNode {
    name: string;
    type?: 'panel' | 'button' | 'label' | 'scroll_view' | 'empty' | 'custom';
    size?: { width: number; height: number };
    position?: { x: number; y: number; z?: number };
    anchor?: { x: number; y: number };
    active?: boolean;
    widget?: {
        alignFlags?: number;
        isAlignTop?: boolean;
        isAlignBottom?: boolean;
        isAlignLeft?: boolean;
        isAlignRight?: boolean;
        isAlignHorizontalCenter?: boolean;
        isAlignVerticalCenter?: boolean;
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
        horizontalCenter?: number;
        verticalCenter?: number;
        alignMode?: number;
    };
    layout?: {
        type?: number | 'HORIZONTAL' | 'VERTICAL' | 'GRID';
        resizeMode?: number | 'NONE' | 'CONTAINER' | 'CHILDREN';
        spacingX?: number;
        spacingY?: number;
        paddingTop?: number;
        paddingBottom?: number;
        paddingLeft?: number;
        paddingRight?: number;
        cellSize?: { width: number; height: number };
    };
    label?: {
        string?: string;
        fontSize?: number;
        lineHeight?: number;
        color?: string | { r: number; g: number; b: number; a?: number };
        horizontalAlign?: number | 'LEFT' | 'CENTER' | 'RIGHT';
        verticalAlign?: number | 'TOP' | 'CENTER' | 'BOTTOM';
        overflow?: number | 'NONE' | 'CLAMP' | 'SHRINK' | 'RESIZE_HEIGHT';
        isBold?: boolean;
        isItalic?: boolean;
    };
    button?: {
        transition?: number | 'NONE' | 'COLOR' | 'SPRITE' | 'SCALE';
        zoomScale?: number;
        duration?: number;
        interactable?: boolean;
    };
    sprite?: {
        spriteFrame?: string;
        type?: number | 'SIMPLE' | 'SLICED' | 'TILED' | 'FILLED';
        color?: string | { r: number; g: number; b: number; a?: number };
        sizeMode?: number | 'CUSTOM' | 'TRIMMED' | 'RAW';
    };
    components?: Array<{
        type: string;
        properties?: Record<string, any>;
    }>;
    children?: UIElementNode[];
}

export class UIBuilderTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'ui_builder',
                description: 'DECLARATIVE 1-SHOT UI & SCENE BUILDER: Build complete multi-level UI hierarchies from a single JSON structure. Automatically computes and attaches cc.UITransform, configures cc.Widget constraints, cc.Layout formatting, buttons, labels, and sliced sprites in an atomic operation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['build_tree', 'create_dialog', 'create_button', 'create_list', 'apply_widget', 'apply_layout'],
                            description: 'UI Builder action: "build_tree" = build recursive JSON UI hierarchy | "create_dialog" = one-call popup modal preset | "create_button" = one-call button preset | "create_list" = ScrollView list preset | "apply_widget" = configure anchor pins | "apply_layout" = configure Layout component'
                        },
                        parent: {
                            type: 'string',
                            description: 'Parent node UUID, path, or name (e.g. "Canvas", "Canvas/UIRoot", or exact node UUID). Defaults to active scene Canvas.'
                        },
                        tree: {
                            type: 'object',
                            description: 'Declarative UI tree node definition (required for build_tree action).'
                        },
                        // Dialog options
                        title: { type: 'string', description: 'Dialog header title text (for create_dialog action)' },
                        width: { type: 'number', description: 'Dialog/Container width in pixels' },
                        height: { type: 'number', description: 'Dialog/Container height in pixels' },
                        bgSpriteFrame: { type: 'string', description: 'Background sliced spriteFrame path or UUID' },
                        buttons: {
                            type: 'array',
                            description: 'Array of button definitions { text, name, color } for create_dialog',
                            items: {
                                type: 'object',
                                properties: {
                                    text: { type: 'string' },
                                    name: { type: 'string' },
                                    color: { type: 'string' }
                                }
                            }
                        },
                        // Button options
                        name: { type: 'string', description: 'Node name' },
                        text: { type: 'string', description: 'Button text label' },
                        position: {
                            type: 'object',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                z: { type: 'number' }
                            }
                        },
                        size: {
                            type: 'object',
                            properties: {
                                width: { type: 'number' },
                                height: { type: 'number' }
                            }
                        },
                        nodeUuid: { type: 'string', description: 'Target node UUID (for apply_widget and apply_layout actions)' },
                        // Widget options
                        alignFlags: { type: 'number', description: 'Bitmask or sum of align flags (1: Top, 2: Bottom, 4: Left, 8: Right, 16: HCenter, 32: VCenter, 15: Stretch Full)' },
                        top: { type: 'number' },
                        bottom: { type: 'number' },
                        left: { type: 'number' },
                        right: { type: 'number' },
                        horizontalCenter: { type: 'number' },
                        verticalCenter: { type: 'number' },
                        // Layout options
                        layoutType: { type: 'string', enum: ['NONE', 'HORIZONTAL', 'VERTICAL', 'GRID'] },
                        resizeMode: { type: 'string', enum: ['NONE', 'CONTAINER', 'CHILDREN'] },
                        spacingX: { type: 'number' },
                        spacingY: { type: 'number' },
                        autoSave: { type: 'boolean', default: true, description: 'Automatically save scene after building' }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        const action = args?.action;
        const hasTargetFile = Boolean(args?.targetFile || args?.scenePath || args?.prefabPath || args?.file);
        if (hasTargetFile || String(action).endsWith('_headless')) {
            return await this.handleHeadlessUIBuild(args);
        }

        switch (action) {
            case 'build_tree':
                return await this.handleBuildTree(args);
            case 'create_dialog':
                return await this.handleCreateDialog(args);
            case 'create_button':
                return await this.handleCreateButton(args);
            case 'create_list':
                return await this.handleCreateList(args);
            case 'apply_widget':
                return await this.handleApplyWidget(args);
            case 'apply_layout':
                return await this.handleApplyLayout(args);
            default:
                return {
                    success: false,
                    error: `Unknown ui_builder action: "${action}". Valid actions: ["build_tree", "create_dialog", "create_button", "create_list", "apply_widget", "apply_layout"]`
                };
        }
    }

    private async handleHeadlessUIBuild(args: any): Promise<ToolResponse> {
        const targetFile = args?.targetFile || args?.scenePath || args?.prefabPath || args?.file;
        const parentPath = args?.parent || args?.parentPath || 'Canvas';
        const tree = args?.tree;

        if (!tree) {
            return { success: false, error: 'Headless UI build requires "tree" structure' };
        }

        const ops = UIBuilderTools.flattenUITreeToOps(tree, parentPath);
        return await HeadlessEditTools.getInstance().executeChain({
            targetFile,
            chain: ops,
            dryRun: args?.dryRun
        });
    }

    public static flattenUITreeToOps(node: UIElementNode, parentPath: string): HeadlessChainOp[] {
        const ops: HeadlessChainOp[] = [];
        const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

        // 1. Create node
        ops.push({
            action: 'create_node',
            name: node.name,
            parentPath: parentPath,
            position: node.position,
            size: node.size,
            anchor: node.anchor,
            active: node.active !== false,
            is2D: true
        });

        // 2. Add Sprite
        if (node.sprite || node.type === 'panel') {
            ops.push({
                action: 'add_component',
                nodePath: currentPath,
                componentType: 'cc.Sprite',
                properties: {
                    ...(node.sprite?.spriteFrame ? { spriteFrame: node.sprite.spriteFrame } : {}),
                    ...(node.sprite?.color ? { color: node.sprite.color } : {}),
                    ...(node.sprite?.type !== undefined ? { type: node.sprite.type } : {})
                }
            });
        }

        // 3. Add Label
        if (node.label || node.type === 'label') {
            ops.push({
                action: 'add_component',
                nodePath: currentPath,
                componentType: 'cc.Label',
                properties: {
                    ...(node.label?.string !== undefined ? { string: node.label.string } : { string: node.name }),
                    ...(node.label?.fontSize !== undefined ? { fontSize: node.label.fontSize } : {}),
                    ...(node.label?.lineHeight !== undefined ? { lineHeight: node.label.lineHeight } : {}),
                    ...(node.label?.color ? { color: node.label.color } : {})
                }
            });
        }

        // 4. Add Button
        if (node.button || node.type === 'button') {
            ops.push({
                action: 'add_component',
                nodePath: currentPath,
                componentType: 'cc.Button',
                properties: {
                    ...(node.button?.transition !== undefined ? { transition: node.button.transition } : {}),
                    ...(node.button?.zoomScale !== undefined ? { zoomScale: node.button.zoomScale } : {}),
                    ...(node.button?.interactable !== undefined ? { interactable: node.button.interactable } : {})
                }
            });
        }

        // 5. Add Widget
        if (node.widget) {
            ops.push({
                action: 'add_component',
                nodePath: currentPath,
                componentType: 'cc.Widget',
                properties: node.widget
            });
        }

        // 6. Add Layout
        if (node.layout) {
            ops.push({
                action: 'add_component',
                nodePath: currentPath,
                componentType: 'cc.Layout',
                properties: node.layout
            });
        }

        // 7. Custom components
        if (Array.isArray(node.components)) {
            for (const c of node.components) {
                ops.push({
                    action: 'add_component',
                    nodePath: currentPath,
                    componentType: c.type,
                    properties: c.properties || {}
                });
            }
        }

        // 8. Recursively process children
        if (Array.isArray(node.children)) {
            for (const child of node.children) {
                ops.push(...UIBuilderTools.flattenUITreeToOps(child, currentPath));
            }
        }

        return ops;
    }

    private async resolveParentUuid(parentQuery?: string): Promise<string> {
        if (!parentQuery || parentQuery === 'Canvas') {
            // Find canvas or root 2D node
            try {
                if (typeof Editor !== 'undefined' && Editor.Message) {
                    const tree: any = await Editor.Message.request('scene', 'query-node-tree');
                    if (tree) {
                        const findCanvas = (node: any): string | null => {
                            if (node.name === 'Canvas') return node.uuid;
                            if (node.children) {
                                for (const child of node.children) {
                                    const res = findCanvas(child);
                                    if (res) return res;
                                }
                            }
                            return null;
                        };
                        const canvasUuid = findCanvas(tree);
                        if (canvasUuid) return canvasUuid;
                        return tree.uuid;
                    }
                }
            } catch {}
            return '';
        }

        // Direct UUID
        if (/^[0-9a-fA-F-]{36}$/.test(parentQuery) || parentQuery.length > 20) {
            return parentQuery;
        }

        // Query by path or name
        try {
            if (typeof Editor !== 'undefined' && Editor.Message) {
                const tree: any = await Editor.Message.request('scene', 'query-node-tree');
                const findNode = (node: any, target: string): string | null => {
                    if (node.name === target || node.uuid === target) return node.uuid;
                    if (node.children) {
                        for (const child of node.children) {
                            const res = findNode(child, target);
                            if (res) return res;
                        }
                    }
                    return null;
                };
                const found = findNode(tree, parentQuery);
                if (found) return found;
            }
        } catch {}

        return parentQuery;
    }

    private async handleBuildTree(args: any): Promise<ToolResponse> {
        const tree: UIElementNode = args?.tree;
        if (!tree) {
            return { success: false, error: 'tree parameter is required for build_tree' };
        }

        const parentUuid = await this.resolveParentUuid(args?.parent);
        const createdNodes: Array<{ name: string; uuid: string; type?: string }> = [];

        try {
            const rootUuid = await this.instantiateNodeRecursive(tree, parentUuid, createdNodes);
            if (args?.autoSave !== false) {
                try {
                    await Editor.Message.request('scene', 'save-scene');
                } catch {}
            }

            return {
                success: true,
                message: `Successfully built UI tree with ${createdNodes.length} nodes`,
                data: {
                    rootUuid,
                    totalCreated: createdNodes.length,
                    nodes: createdNodes
                }
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to build UI tree: ${err?.message || err}`,
                data: { createdBeforeFailure: createdNodes }
            };
        }
    }

    private async instantiateNodeRecursive(
        def: UIElementNode,
        parentUuid: string,
        createdNodes: Array<{ name: string; uuid: string; type?: string }>
    ): Promise<string> {
        if (typeof Editor === 'undefined' || !Editor.Message) {
            throw new Error('Editor environment unavailable');
        }

        // 1. Create node via Editor.Message
        const createOptions: any = {
            parent: parentUuid,
            name: def.name || 'UINode',
            assetUuid: null
        };

        const nodeUuid: string = await Editor.Message.request('scene', 'create-node', createOptions);
        if (!nodeUuid) {
            throw new Error(`Failed to create node: ${def.name}`);
        }

        createdNodes.push({ name: def.name, uuid: nodeUuid, type: def.type });

        // 2. Add cc.UITransform if 2D or size/anchor specified
        const width = def.size?.width ?? (def.type === 'button' ? 160 : def.type === 'panel' ? 300 : 100);
        const height = def.size?.height ?? (def.type === 'button' ? 50 : def.type === 'panel' ? 200 : 100);
        const anchorX = def.anchor?.x ?? 0.5;
        const anchorY = def.anchor?.y ?? 0.5;

        // Execute scene script to setup UITransform and transform
        try {
            await Editor.Message.request('scene', 'execute-scene-script', {
                name: SCENE_SCRIPT_TARGET,
                method: 'executeMethod',
                args: [nodeUuid, 'ensureUITransform', [{ width, height }, { x: anchorX, y: anchorY }]]
            });
        } catch {}

        // Set position if specified
        if (def.position) {
            try {
                await Editor.Message.request('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: 'position',
                    dump: {
                        type: 'cc.Vec3',
                        value: { x: def.position.x || 0, y: def.position.y || 0, z: def.position.z || 0 }
                    }
                });
            } catch {}
        }

        // 3. Setup type-specific presets
        if (def.type === 'panel' || def.sprite) {
            await this.attachSpriteComponent(nodeUuid, def.sprite);
        } else if (def.type === 'label' || def.label) {
            await this.attachLabelComponent(nodeUuid, def.label);
        } else if (def.type === 'button' || def.button) {
            await this.attachButtonComponent(nodeUuid, def.button, def.sprite);
        }

        // 4. Setup cc.Widget
        if (def.widget) {
            await this.setupWidgetComponent(nodeUuid, def.widget);
        }

        // 5. Setup cc.Layout
        if (def.layout) {
            await this.setupLayoutComponent(nodeUuid, def.layout);
        }

        // 6. Setup custom components
        if (Array.isArray(def.components)) {
            for (const comp of def.components) {
                try {
                    await Editor.Message.request('scene', 'create-component', {
                        uuid: nodeUuid,
                        component: comp.type
                    });
                    if (comp.properties && Object.keys(comp.properties).length > 0) {
                        for (const [prop, val] of Object.entries(comp.properties)) {
                            await Editor.Message.request('scene', 'set-property', {
                                uuid: nodeUuid,
                                path: prop,
                                dump: { value: val }
                            });
                        }
                    }
                } catch {}
            }
        }

        // 7. Recursively process children
        if (Array.isArray(def.children)) {
            for (const childDef of def.children) {
                await this.instantiateNodeRecursive(childDef, nodeUuid, createdNodes);
            }
        }

        return nodeUuid;
    }

    private async attachSpriteComponent(nodeUuid: string, spriteDef?: any): Promise<void> {
        try {
            await Editor.Message.request('scene', 'create-component', { uuid: nodeUuid, component: 'cc.Sprite' });
            if (spriteDef?.spriteFrame) {
                await Editor.Message.request('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: 'spriteFrame',
                    dump: { value: spriteDef.spriteFrame }
                });
            }
            if (spriteDef?.type !== undefined) {
                const spriteType = typeof spriteDef.type === 'string'
                    ? (spriteDef.type === 'SLICED' ? 1 : spriteDef.type === 'TILED' ? 2 : spriteDef.type === 'FILLED' ? 3 : 0)
                    : spriteDef.type;
                await Editor.Message.request('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: 'type',
                    dump: { value: spriteType }
                });
            }
        } catch {}
    }

    private async attachLabelComponent(nodeUuid: string, labelDef?: any): Promise<void> {
        try {
            await Editor.Message.request('scene', 'create-component', { uuid: nodeUuid, component: 'cc.Label' });
            if (labelDef?.string !== undefined) {
                await Editor.Message.request('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: 'string',
                    dump: { value: String(labelDef.string) }
                });
            }
            if (labelDef?.fontSize !== undefined) {
                await Editor.Message.request('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: 'fontSize',
                    dump: { value: Number(labelDef.fontSize) }
                });
            }
        } catch {}
    }

    private async attachButtonComponent(nodeUuid: string, buttonDef?: any, spriteDef?: any): Promise<void> {
        try {
            await this.attachSpriteComponent(nodeUuid, spriteDef);
            await Editor.Message.request('scene', 'create-component', { uuid: nodeUuid, component: 'cc.Button' });
            const transition = buttonDef?.transition === 'SCALE' ? 3 : buttonDef?.transition === 'COLOR' ? 1 : 3; // Default SCALE for tactile feel
            await Editor.Message.request('scene', 'set-property', {
                uuid: nodeUuid,
                path: 'transition',
                dump: { value: transition }
            });
            if (buttonDef?.zoomScale !== undefined) {
                await Editor.Message.request('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: 'zoomScale',
                    dump: { value: Number(buttonDef.zoomScale) }
                });
            }
        } catch {}
    }

    private async setupWidgetComponent(nodeUuid: string, widgetDef: any): Promise<void> {
        try {
            await Editor.Message.request('scene', 'create-component', { uuid: nodeUuid, component: 'cc.Widget' });
            const flags = widgetDef.alignFlags || 0;
            const isTop = Boolean(widgetDef.isAlignTop || (flags & 1));
            const isBottom = Boolean(widgetDef.isAlignBottom || (flags & 2));
            const isLeft = Boolean(widgetDef.isAlignLeft || (flags & 4));
            const isRight = Boolean(widgetDef.isAlignRight || (flags & 8));

            if (isTop) await this.setNodeProp(nodeUuid, 'isAlignTop', true);
            if (isBottom) await this.setNodeProp(nodeUuid, 'isAlignBottom', true);
            if (isLeft) await this.setNodeProp(nodeUuid, 'isAlignLeft', true);
            if (isRight) await this.setNodeProp(nodeUuid, 'isAlignRight', true);

            if (widgetDef.top !== undefined) await this.setNodeProp(nodeUuid, 'top', widgetDef.top);
            if (widgetDef.bottom !== undefined) await this.setNodeProp(nodeUuid, 'bottom', widgetDef.bottom);
            if (widgetDef.left !== undefined) await this.setNodeProp(nodeUuid, 'left', widgetDef.left);
            if (widgetDef.right !== undefined) await this.setNodeProp(nodeUuid, 'right', widgetDef.right);
        } catch {}
    }

    private async setupLayoutComponent(nodeUuid: string, layoutDef: any): Promise<void> {
        try {
            await Editor.Message.request('scene', 'create-component', { uuid: nodeUuid, component: 'cc.Layout' });
            const type = layoutDef.type === 'VERTICAL' ? 2 : layoutDef.type === 'GRID' ? 3 : 1; // HORIZONTAL
            await this.setNodeProp(nodeUuid, 'type', type);
            if (layoutDef.spacingX !== undefined) await this.setNodeProp(nodeUuid, 'spacingX', layoutDef.spacingX);
            if (layoutDef.spacingY !== undefined) await this.setNodeProp(nodeUuid, 'spacingY', layoutDef.spacingY);
        } catch {}
    }

    private async setNodeProp(nodeUuid: string, path: string, value: any): Promise<void> {
        try {
            await Editor.Message.request('scene', 'set-property', { uuid: nodeUuid, path, dump: { value } });
        } catch {}
    }

    private async handleCreateDialog(args: any): Promise<ToolResponse> {
        const dialogWidth = args?.width || 600;
        const dialogHeight = args?.height || 420;
        const title = args?.title || 'Notice';
        const buttons = Array.isArray(args?.buttons) && args.buttons.length > 0
            ? args.buttons
            : [{ text: 'OK', name: 'ConfirmButton' }];

        const dialogTree: UIElementNode = {
            name: args?.name || 'ModalDialog',
            type: 'empty',
            widget: { alignFlags: 15 }, // Full screen
            children: [
                {
                    name: 'Dimmer',
                    type: 'panel',
                    size: { width: 1920, height: 1080 },
                    widget: { alignFlags: 15 },
                    sprite: { color: { r: 0, g: 0, b: 0, a: 160 } }
                },
                {
                    name: 'DialogWindow',
                    type: 'panel',
                    size: { width: dialogWidth, height: dialogHeight },
                    position: { x: 0, y: 0 },
                    sprite: { spriteFrame: args?.bgSpriteFrame, type: 'SLICED' },
                    children: [
                        {
                            name: 'TitleLabel',
                            type: 'label',
                            position: { x: 0, y: dialogHeight / 2 - 40 },
                            label: { string: title, fontSize: 32 }
                        },
                        {
                            name: 'ButtonGroup',
                            type: 'empty',
                            position: { x: 0, y: -dialogHeight / 2 + 50 },
                            layout: { type: 'HORIZONTAL', spacingX: 20 },
                            children: buttons.map((b: any) => ({
                                name: b.name || 'Button',
                                type: 'button',
                                size: { width: 160, height: 50 },
                                button: { transition: 'SCALE', zoomScale: 1.05 },
                                children: [
                                    {
                                        name: 'Label',
                                        type: 'label',
                                        label: { string: b.text || 'Button', fontSize: 22 }
                                    }
                                ]
                            }))
                        }
                    ]
                }
            ]
        };

        return await this.handleBuildTree({ parent: args?.parent, tree: dialogTree, autoSave: args?.autoSave });
    }

    private async handleCreateButton(args: any): Promise<ToolResponse> {
        const buttonTree: UIElementNode = {
            name: args?.name || 'UIButton',
            type: 'button',
            position: args?.position || { x: 0, y: 0 },
            size: args?.size || { width: 180, height: 60 },
            sprite: { spriteFrame: args?.spriteFrame, type: 'SLICED' },
            button: { transition: 'SCALE', zoomScale: 1.05 },
            children: [
                {
                    name: 'Label',
                    type: 'label',
                    label: { string: args?.text || 'Click', fontSize: 24 }
                }
            ]
        };

        return await this.handleBuildTree({ parent: args?.parent, tree: buttonTree, autoSave: args?.autoSave });
    }

    private async handleCreateList(args: any): Promise<ToolResponse> {
        const listTree: UIElementNode = {
            name: args?.name || 'ScrollView',
            type: 'scroll_view',
            size: args?.size || { width: 400, height: 600 },
            position: args?.position || { x: 0, y: 0 },
            components: [
                { type: 'cc.ScrollView', properties: { horizontal: false, vertical: true } }
            ],
            children: [
                {
                    name: 'View',
                    type: 'empty',
                    size: args?.size || { width: 400, height: 600 },
                    components: [{ type: 'cc.Mask' }],
                    children: [
                        {
                            name: 'Content',
                            type: 'empty',
                            anchor: { x: 0.5, y: 1 },
                            size: { width: args?.size?.width || 400, height: 100 },
                            layout: { type: 'VERTICAL', resizeMode: 'CONTAINER', spacingY: 10 }
                        }
                    ]
                }
            ]
        };

        return await this.handleBuildTree({ parent: args?.parent, tree: listTree, autoSave: args?.autoSave });
    }

    private async handleApplyWidget(args: any): Promise<ToolResponse> {
        const nodeUuid = args?.nodeUuid;
        if (!nodeUuid) return { success: false, error: 'nodeUuid required for apply_widget' };
        await this.setupWidgetComponent(nodeUuid, args);
        return { success: true, message: `Configured cc.Widget on node ${nodeUuid}` };
    }

    private async handleApplyLayout(args: any): Promise<ToolResponse> {
        const nodeUuid = args?.nodeUuid;
        if (!nodeUuid) return { success: false, error: 'nodeUuid required for apply_layout' };
        await this.setupLayoutComponent(nodeUuid, args);
        return { success: true, message: `Configured cc.Layout on node ${nodeUuid}` };
    }
}
