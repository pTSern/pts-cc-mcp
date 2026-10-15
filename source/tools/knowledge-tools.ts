import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export interface ComponentKnowledge {
    className: string;
    category: '2D' | 'UI' | '3D' | 'Physics' | 'Animation' | 'Audio' | 'Core';
    description: string;
    requiredComponents: string[];
    properties: Record<string, {
        type: string;
        default?: any;
        description: string;
        validValues?: any[];
        notes?: string;
    }>;
    pitfalls: string[];
}

export class KnowledgeTools implements ToolExecutor {
    private componentCatalog: Record<string, ComponentKnowledge> = {
        'cc.UITransform': {
            className: 'cc.UITransform',
            category: 'UI',
            description: 'Core 2D transform component defining content size, anchor point, and priority. Mandatory on all 2D renderable and layout nodes.',
            requiredComponents: [],
            properties: {
                contentSize: {
                    type: 'Size',
                    default: { width: 100, height: 100 },
                    description: 'Bounding box size (width, height) in 2D space. In 3.8, node.width and node.height are deprecated in favor of UITransform.contentSize.'
                },
                anchorPoint: {
                    type: 'Vec2',
                    default: { x: 0.5, y: 0.5 },
                    description: 'Normalized anchor point. (0.5, 0.5) is center; (0, 0) is bottom-left; (0, 1) is top-left.'
                },
                priority: {
                    type: 'number',
                    default: 0,
                    description: 'Render sorting priority among sibling nodes.'
                }
            },
            pitfalls: [
                'Do not write node.width or node.height directly in Cocos 3.8. Use node.getComponent(cc.UITransform).setContentSize(w, h).',
                'All children of cc.Canvas or 2D UI nodes MUST have cc.UITransform to render or respond to layout.'
            ]
        },
        'cc.Sprite': {
            className: 'cc.Sprite',
            category: '2D',
            description: 'Renders 2D images and sprites using spriteFrame assets.',
            requiredComponents: ['cc.UITransform'],
            properties: {
                spriteFrame: {
                    type: 'SpriteFrame',
                    description: 'Target SpriteFrame sub-asset (UUID ending with @f9941 or path with @spriteFrame).',
                    notes: 'Do NOT pass raw texture image UUID. Always use the @f9941 sub-asset.'
                },
                type: {
                    type: 'number',
                    default: 0,
                    validValues: [0, 1, 2, 3],
                    description: '0: SIMPLE, 1: SLICED (9-slice), 2: TILED, 3: FILLED.'
                },
                color: {
                    type: 'Color',
                    default: { r: 255, g: 255, b: 255, a: 255 },
                    description: 'Tint color and opacity.'
                },
                sizeMode: {
                    type: 'number',
                    default: 0,
                    validValues: [0, 1, 2],
                    description: '0: CUSTOM (keeps UITransform size), 1: TRIMMED (matches sprite frame trim), 2: RAW (original image size).'
                },
                trim: {
                    type: 'boolean',
                    default: true,
                    description: 'Whether to trim transparent pixels.'
                }
            },
            pitfalls: [
                'SLICED mode requires 9-slice borders configured in texture meta; otherwise it renders stretched as SIMPLE.',
                'Sub-asset resolution: ALWAYS use asset_query(action="resolve") or append @spriteFrame to resolve image path to SpriteFrame UUID.'
            ]
        },
        'cc.Label': {
            className: 'cc.Label',
            category: 'UI',
            description: 'Renders text with system font, TTF, or BMFont.',
            requiredComponents: ['cc.UITransform'],
            properties: {
                string: {
                    type: 'string',
                    default: 'Label',
                    description: 'Displayed text string.'
                },
                fontSize: {
                    type: 'number',
                    default: 20,
                    description: 'Font size in points/pixels.'
                },
                lineHeight: {
                    type: 'number',
                    default: 20,
                    description: 'Line height spacing.'
                },
                color: {
                    type: 'Color',
                    default: { r: 255, g: 255, b: 255, a: 255 },
                    description: 'Text color.'
                },
                horizontalAlign: {
                    type: 'number',
                    default: 0,
                    validValues: [0, 1, 2],
                    description: '0: LEFT, 1: CENTER, 2: RIGHT.'
                },
                verticalAlign: {
                    type: 'number',
                    default: 1,
                    validValues: [0, 1, 2],
                    description: '0: TOP, 1: CENTER, 2: BOTTOM.'
                },
                overflow: {
                    type: 'number',
                    default: 0,
                    validValues: [0, 1, 2, 3],
                    description: '0: NONE, 1: CLAMP, 2: SHRINK, 3: RESIZE_HEIGHT.'
                },
                isBold: { type: 'boolean', default: false, description: 'Bold text style.' },
                isItalic: { type: 'boolean', default: false, description: 'Italic text style.' }
            },
            pitfalls: [
                'If overflow is RESIZE_HEIGHT, width is fixed and height expands with text content.',
                'Ensure lineHeight >= fontSize; if lineHeight is smaller, lines may overlap.'
            ]
        },
        'cc.Button': {
            className: 'cc.Button',
            category: 'UI',
            description: 'Interactive button component handling touch/click events and state transitions.',
            requiredComponents: ['cc.UITransform'],
            properties: {
                target: {
                    type: 'Node',
                    description: 'Target node that receives color/scale/sprite transition animations (defaults to self).'
                },
                transition: {
                    type: 'number',
                    default: 1,
                    validValues: [0, 1, 2, 3],
                    description: '0: NONE, 1: COLOR, 2: SPRITE, 3: SCALE.'
                },
                duration: {
                    type: 'number',
                    default: 0.1,
                    description: 'Transition animation duration in seconds.'
                },
                zoomScale: {
                    type: 'number',
                    default: 1.1,
                    description: 'Scale multiplier when pressed (for SCALE transition).'
                },
                interactable: {
                    type: 'boolean',
                    default: true,
                    description: 'Whether button responds to user input.'
                },
                clickEvents: {
                    type: 'EventHandler[]',
                    default: [],
                    description: 'List of Component event handlers triggered on click.'
                }
            },
            pitfalls: [
                'Button must have a target node (often self or background child) to animate transitions.',
                'Nodes behind semi-transparent buttons will receive touches unless a BlockInputEvents component is attached.'
            ]
        },
        'cc.Widget': {
            className: 'cc.Widget',
            category: 'UI',
            description: 'UI layout constraint anchor aligning node relative to its parent container or screen boundaries.',
            requiredComponents: ['cc.UITransform'],
            properties: {
                isAlignTop: { type: 'boolean', default: false, description: 'Pin to parent top edge.' },
                isAlignBottom: { type: 'boolean', default: false, description: 'Pin to parent bottom edge.' },
                isAlignLeft: { type: 'boolean', default: false, description: 'Pin to parent left edge.' },
                isAlignRight: { type: 'boolean', default: false, description: 'Pin to parent right edge.' },
                isAlignHorizontalCenter: { type: 'boolean', default: false, description: 'Center horizontally.' },
                isAlignVerticalCenter: { type: 'boolean', default: false, description: 'Center vertically.' },
                top: { type: 'number', default: 0, description: 'Margin from top edge in pixels.' },
                bottom: { type: 'number', default: 0, description: 'Margin from bottom edge in pixels.' },
                left: { type: 'number', default: 0, description: 'Margin from left edge in pixels.' },
                right: { type: 'number', default: 0, description: 'Margin from right edge in pixels.' },
                alignMode: {
                    type: 'number',
                    default: 1,
                    validValues: [0, 1, 2],
                    description: '0: ONCE (on load), 1: ON_WINDOW_RESIZE, 2: ALWAYS (every frame).'
                }
            },
            pitfalls: [
                'Do not combine conflicting pins without explicit sizing (e.g. isAlignLeft + isAlignRight stretches the node width to fill parent).',
                'Setting alignMode: ALWAYS (2) has higher CPU overhead; use ON_WINDOW_RESIZE (1) for static UI.'
            ]
        },
        'cc.Layout': {
            className: 'cc.Layout',
            category: 'UI',
            description: 'Arranges child nodes in sequential horizontal, vertical, or grid layouts.',
            requiredComponents: ['cc.UITransform'],
            properties: {
                type: {
                    type: 'number',
                    default: 0,
                    validValues: [0, 1, 2, 3],
                    description: '0: NONE, 1: HORIZONTAL, 2: VERTICAL, 3: GRID.'
                },
                resizeMode: {
                    type: 'number',
                    default: 0,
                    validValues: [0, 1, 2],
                    description: '0: NONE, 1: CONTAINER (parent resizes to fit children), 2: CHILDREN (children resize to fit parent).'
                },
                spacingX: { type: 'number', default: 0, description: 'Horizontal spacing between children.' },
                spacingY: { type: 'number', default: 0, description: 'Vertical spacing between children.' },
                paddingTop: { type: 'number', default: 0, description: 'Top padding.' },
                paddingBottom: { type: 'number', default: 0, description: 'Bottom padding.' },
                paddingLeft: { type: 'number', default: 0, description: 'Left padding.' },
                paddingRight: { type: 'number', default: 0, description: 'Right padding.' },
                cellSize: { type: 'Size', default: { width: 100, height: 100 }, description: 'Cell size for GRID layout.' }
            },
            pitfalls: [
                'When resizeMode: CONTAINER, manually changing UITransform size on this node will be overwritten by children bounds.',
                'Child nodes should not have active cc.Widget components conflicting with the Layout axis.'
            ]
        },
        'cc.ScrollView': {
            className: 'cc.ScrollView',
            category: 'UI',
            description: 'Scrollable container with inertia, bounce, and scrollbar support.',
            requiredComponents: ['cc.UITransform'],
            properties: {
                content: { type: 'Node', description: 'Target content node containing items (requires cc.UITransform).' },
                horizontal: { type: 'boolean', default: true, description: 'Allow horizontal scrolling.' },
                vertical: { type: 'boolean', default: true, description: 'Allow vertical scrolling.' },
                inertia: { type: 'boolean', default: true, description: 'Momentum scroll effect.' },
                brake: { type: 'number', default: 0.75, description: 'Inertia deceleration factor (0 - 1).' },
                elastic: { type: 'boolean', default: true, description: 'Bounce back when scrolled past edge.' },
                bounceDuration: { type: 'number', default: 0.23, description: 'Bounce back animation duration.' }
            },
            pitfalls: [
                'ScrollView hierarchy requires: Viewport node (with cc.Mask and cc.UITransform) containing the Content node.',
                'Content node anchor should typically be (0, 1) for top-to-bottom vertical scrolling lists.'
            ]
        },
        'sp.Skeleton': {
            className: 'sp.Skeleton',
            category: 'Animation',
            description: 'Renders and controls Spine 2D skeletal animations.',
            requiredComponents: ['cc.UITransform'],
            properties: {
                skeletonData: { type: 'sp.SkeletonData', description: 'Target Spine skeleton data asset UUID.' },
                defaultSkin: { type: 'string', default: 'default', description: 'Default skin name.' },
                defaultAnimation: { type: 'string', description: 'Initial animation to play on load.' },
                loop: { type: 'boolean', default: true, description: 'Loop default animation.' },
                premultipliedAlpha: { type: 'boolean', default: true, description: 'Texture alpha blending mode.' },
                timeScale: { type: 'number', default: 1.0, description: 'Animation playback speed multiplier.' }
            },
            pitfalls: [
                'Spine assets in Cocos 3.8 consist of 3 files: .json/.skel, .atlas, and .png. The skeletonData asset is the .json/.skel UUID.',
                'Use spine_setup tool for automated one-click rig attachment and parameter configuration.'
            ]
        },
        'cc.Camera': {
            className: 'cc.Camera',
            category: '3D',
            description: 'Renders 2D or 3D scene nodes to screen or render textures.',
            requiredComponents: [],
            properties: {
                priority: { type: 'number', default: 0, description: 'Rendering order (higher renders on top).' },
                visibility: { type: 'number', default: 0xffffffff, description: 'Bitmask layers visible to this camera.' },
                clearFlags: { type: 'number', default: 7, description: 'Clear flags for color, depth, stencil buffers.' },
                projection: { type: 'number', default: 0, validValues: [0, 1], description: '0: PERSPECTIVE, 1: ORTHO.' },
                fov: { type: 'number', default: 45, description: 'Field of view in degrees (Perspective).' },
                orthoHeight: { type: 'number', default: 10, description: 'Viewport height in world units (Ortho).' },
                near: { type: 'number', default: 1, description: 'Near clipping plane.' },
                far: { type: 'number', default: 1000, description: 'Far clipping plane.' }
            },
            pitfalls: [
                '2D UI requires an Orthographic camera with visibility set to the UI_2D layer.',
                'If UI is invisible, ensure Canvas cameraComponent is assigned or a camera with UI_2D flag is active.'
            ]
        }
    };

    private rulesCatalog: Record<string, any> = {
        coordinates: {
            title: 'Coordinate Systems & Space Transformations',
            details: [
                'World Space: Global 3D coordinate system (x right, y up, z forward).',
                'Node Local Space: Relative to node position. (0,0,0) is the node local origin.',
                'Anchor Relative (AR) Space: 2D local space where (0,0) is at node anchor point. Node boundaries: [-anchorX * width, (1-anchorX) * width] x [-anchorY * height, (1-anchorY) * height].',
                'Screen Space: Cocos Creator origin is at the BOTTOM-LEFT of the display screen (unlike web CSS top-left).',
                'Transformation Code:',
                '  const uiTransform = node.getComponent(cc.UITransform);',
                '  const worldPos = uiTransform.convertToWorldSpaceAR(new cc.Vec3(0, 0, 0));',
                '  const localPos = uiTransform.convertToNodeSpaceAR(worldPos);'
            ]
        },
        resolution: {
            title: 'Design Resolution & Multi-Screen Adaptation',
            details: [
                'Design Resolution: Configured in Project Settings (e.g. 720 x 1280 portrait, 1920 x 1080 landscape).',
                'Fit Width (fitWidth: true, fitHeight: false): Scales scene so canvas width fits screen width exactly. Best for tall mobile portrait games. Top and bottom extend.',
                'Fit Height (fitWidth: false, fitHeight: true): Scales scene so canvas height fits screen height exactly. Best for wide landscape games. Left and right extend.',
                'Always use cc.Widget anchors on border UI elements (HUD, score, buttons) to guarantee placement across different aspect ratios (16:9, 19.5:9, 4:3).'
            ]
        },
        anchors: {
            title: 'Anchor Point Mechanics',
            details: [
                '(0.5, 0.5): Default center anchor. Best for dialogs, panels, buttons, sprites, and rotated elements.',
                '(0, 1): Top-left anchor. Best for multi-line text labels, vertical scrolling lists, and top-aligned menus.',
                '(0, 0): Bottom-left anchor. Matches screen origin.',
                '(0.5, 0): Bottom-center anchor. Best for ground characters and bottom navigation bars.',
                '(0.5, 1): Top-center anchor. Best for top notifications and drop-down banners.'
            ]
        },
        lifecycle: {
            title: 'Component Lifecycle Execution Sequence',
            details: [
                '1. __preload(): Engine internal initialization before scene loading.',
                '2. onLoad(): Called when node is first instantiated and activated. Initialize variables and query children here.',
                '3. onEnable(): Called whenever node or component becomes active. Register event listeners here.',
                '4. start(): Called before the first frame update. Cross-component coordination and game start logic.',
                '5. update(deltaTime): Frame update callback. Put gameplay physics, animations, or countdown timers here.',
                '6. lateUpdate(deltaTime): Post-frame update. Put camera tracking or post-physics adjustments here.',
                '7. onDisable(): Called whenever node or component is deactivated. Unregister event listeners here.',
                '8. onDestroy(): Called when node is destroyed. Cleanup resources and memory.'
            ]
        },
        subassets: {
            title: 'Smart Sub-Asset Resolution Architecture',
            details: [
                'Texture image files (.png, .jpg) produce multiple sub-assets in Cocos Creator 3.8:',
                '  - Raw ImageAsset: root UUID (e.g. "uuid")',
                '  - Texture2D: UUID with suffix "@6c48a"',
                '  - SpriteFrame: UUID with suffix "@f9941"',
                'CRITICAL: cc.Sprite.spriteFrame expects the SpriteFrame UUID (@f9941), NOT the root image UUID.',
                'pts-cc-mcp provides automatic resolution via asset_query(action="resolve") and deep resolvers in set_component_property.'
            ]
        }
    };

    private patternCatalog: Record<string, any> = {
        dialog: {
            name: 'Modal Popup Dialog Pattern',
            structure: {
                Root: 'PopupDialog (Node with BlockInputEvents, Widget alignFlags: 15 full screen)',
                Dimmer: 'DimmerOverlay (Sprite with black color a=180, Widget alignFlags: 15)',
                Window: 'WindowContainer (Node with UITransform 600x400, Sprite sliced panel)',
                Header: 'TitleLabel (Label, positioned top center with Widget isAlignTop: true)',
                Content: 'BodyText (Label or Content Container)',
                CloseBtn: 'CloseButton (Button, top right)',
                ActionButtons: 'ButtonContainer (Layout horizontal, centered at bottom)'
            }
        },
        hud: {
            name: 'In-Game Heads-Up Display (HUD) Pattern',
            structure: {
                Root: 'HUD (Node with Widget alignFlags: 15 full screen)',
                TopBar: 'TopBar (Widget isAlignTop: true, height: 80, containing Lives, Coins, Level indicator)',
                PauseBtn: 'PauseButton (Widget isAlignTop: true, isAlignRight: true)',
                BottomBar: 'BottomBar (Widget isAlignBottom: true, containing Boosters, Special Actions)'
            }
        },
        list: {
            name: 'Dynamic Scrollable List Pattern',
            structure: {
                Root: 'ScrollViewNode (Node with cc.ScrollView, cc.UITransform)',
                Viewport: 'View (Node with cc.Mask, cc.UITransform matching scroll area)',
                Content: 'Content (Node with cc.Layout VERTICAL, anchor (0, 1), auto-resizing CONTAINER)',
                ItemTemplate: 'ListItemPrefab (Instantiated dynamically into Content node)'
            }
        },
        grid: {
            name: 'Inventory / Shop Item Grid Pattern',
            structure: {
                Root: 'GridContainer (Node with cc.UITransform, cc.Layout GRID)',
                Config: 'Layout.cellSize: (100, 100), spacingX: 12, spacingY: 12, resizeMode: CONTAINER',
                Children: 'ItemSlots (Multiple item cards arranged automatically)'
            }
        }
    };

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'knowledge_query',
                description: 'COCOS CREATOR 3.8 KNOWLEDGE BASE: Offline in-memory architecture reference and reflection tables for Cocos Creator 3.8 components, coordinate systems, layout patterns, and best practices. Eliminates API hallucinations.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['query_component', 'query_rules', 'query_layout_patterns', 'query_coordinates', 'list_topics'],
                            description: 'Action opcode: "query_component" = get component property dictionary | "query_rules" = architectural rules | "query_layout_patterns" = UI patterns | "query_coordinates" = coordinate transformation specs | "list_topics" = list available topics'
                        },
                        className: {
                            type: 'string',
                            description: 'Component class name (for query_component action), e.g. "cc.Sprite", "cc.Label", "cc.Button", "cc.UITransform", "cc.Widget", "cc.Layout", "cc.ScrollView", "sp.Skeleton", "cc.Camera"'
                        },
                        topic: {
                            type: 'string',
                            enum: ['coordinates', 'resolution', 'anchors', 'lifecycle', 'subassets'],
                            description: 'Architectural topic (for query_rules action)'
                        },
                        pattern: {
                            type: 'string',
                            enum: ['dialog', 'hud', 'list', 'grid'],
                            description: 'UI layout pattern (for query_layout_patterns action)'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        const action = args?.action || 'list_topics';

        switch (action) {
            case 'query_component':
                return this.handleQueryComponent(args?.className);
            case 'query_rules':
                return this.handleQueryRules(args?.topic);
            case 'query_layout_patterns':
                return this.handleQueryPatterns(args?.pattern);
            case 'query_coordinates':
                return this.handleQueryRules('coordinates');
            case 'list_topics':
                return {
                    success: true,
                    data: {
                        availableComponents: Object.keys(this.componentCatalog),
                        availableRules: Object.keys(this.rulesCatalog),
                        availablePatterns: Object.keys(this.patternCatalog)
                    }
                };
            default:
                return {
                    success: false,
                    error: `Unknown action: "${action}". Valid actions: ["query_component", "query_rules", "query_layout_patterns", "query_coordinates", "list_topics"]`
                };
        }
    }

    private handleQueryComponent(className?: string): ToolResponse {
        if (!className) {
            return {
                success: false,
                error: 'className is required for query_component (e.g. "cc.Sprite", "cc.Label", "cc.Button", "cc.UITransform")'
            };
        }

        const normalized = className.startsWith('cc.') || className.startsWith('sp.') ? className : `cc.${className}`;
        const info = this.componentCatalog[normalized] || this.componentCatalog[className];

        if (info) {
            return { success: true, data: info };
        }

        return {
            success: false,
            error: `Component "${className}" not found in knowledge catalog. Available components: ${Object.keys(this.componentCatalog).join(', ')}`
        };
    }

    private handleQueryRules(topic?: string): ToolResponse {
        if (!topic) {
            return {
                success: true,
                data: this.rulesCatalog
            };
        }

        const rule = this.rulesCatalog[topic];
        if (rule) {
            return { success: true, data: rule };
        }

        return {
            success: false,
            error: `Topic "${topic}" not found. Available topics: ${Object.keys(this.rulesCatalog).join(', ')}`
        };
    }

    private handleQueryPatterns(pattern?: string): ToolResponse {
        if (!pattern) {
            return {
                success: true,
                data: this.patternCatalog
            };
        }

        const p = this.patternCatalog[pattern];
        if (p) {
            return { success: true, data: p };
        }

        return {
            success: false,
            error: `Pattern "${pattern}" not found. Available patterns: ${Object.keys(this.patternCatalog).join(', ')}`
        };
    }
}
