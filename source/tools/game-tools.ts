import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { EXTENSION_NAME, SCENE_SCRIPT_TARGET } from '../constants';

declare const Editor: any;

export class GameTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'tap',
                description: 'GAMEPLAY TAP / CLICK: Simulates a screen touch / click at (x, y) coordinates on the game canvas. Hits 2D UI elements (triggers cc.Button click handlers) and dispatches cc.input events in preview mode. Coordinates can be pixel values or normalized (0.0 - 1.0).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        x: {
                            type: 'number',
                            description: 'X coordinate on screen (pixel value e.g. 640, or normalized 0.0 - 1.0 e.g. 0.5 for center)'
                        },
                        y: {
                            type: 'number',
                            description: 'Y coordinate on screen (pixel value e.g. 360, or normalized 0.0 - 1.0 e.g. 0.5 for center)'
                        },
                        duration: {
                            type: 'number',
                            description: 'Touch duration in milliseconds (default: 50)',
                            default: 50
                        },
                        origin: {
                            type: 'string',
                            enum: ['bottom-left', 'top-left'],
                            description: 'Coordinate origin: "bottom-left" (standard Cocos engine screen space) or "top-left" (standard web/CSS space). Default is "bottom-left".',
                            default: 'bottom-left'
                        }
                    },
                    required: ['x', 'y']
                }
            },
            {
                name: 'swipe',
                description: 'GAMEPLAY SWIPE / DRAG: Simulates a touch drag gesture from (startX, startY) to (endX, endY) with interpolated TOUCH_MOVE events. Essential for Match-3 tile swapping, scrolling, and dragging in preview mode.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        startX: {
                            type: 'number',
                            description: 'Start X coordinate (pixels or normalized 0.0 - 1.0)'
                        },
                        startY: {
                            type: 'number',
                            description: 'Start Y coordinate (pixels or normalized 0.0 - 1.0)'
                        },
                        endX: {
                            type: 'number',
                            description: 'End X coordinate (pixels or normalized 0.0 - 1.0)'
                        },
                        endY: {
                            type: 'number',
                            description: 'End Y coordinate (pixels or normalized 0.0 - 1.0)'
                        },
                        duration: {
                            type: 'number',
                            description: 'Swipe duration in milliseconds (default: 200ms)',
                            default: 200
                        },
                        steps: {
                            type: 'number',
                            description: 'Number of intermediate move events (default: 8)',
                            default: 8
                        },
                        origin: {
                            type: 'string',
                            enum: ['bottom-left', 'top-left'],
                            description: 'Coordinate origin: "bottom-left" or "top-left". Default is "bottom-left".',
                            default: 'bottom-left'
                        }
                    },
                    required: ['startX', 'startY', 'endX', 'endY']
                }
            },
            {
                name: 'tap_node',
                description: 'GAMEPLAY CLICK UI NODE: Locates a UI node by name, hierarchy path (e.g. "Canvas/BtnPlay"), or UUID and triggers its cc.Button click handlers and touch events directly. Best for reliable UI menu navigation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        target: {
                            type: 'string',
                            description: 'Node name (e.g. "BtnPlay"), node hierarchy path (e.g. "Canvas/Header/BtnSettings"), or node UUID'
                        }
                    },
                    required: ['target']
                }
            },
            {
                name: 'screenshot',
                description: 'GAMEPLAY SCREENSHOT: Captures the active rendered frame of the game canvas in preview mode and saves it to a PNG file on disk (and optionally returns Base64). Allows the AI agent to visually see the game board and popups.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        savePath: {
                            type: 'string',
                            description: 'Absolute file path to save the captured PNG image. If omitted, saves to project temp folder.'
                        },
                        returnBase64: {
                            type: 'boolean',
                            description: 'Whether to include the raw Base64 image data in the tool response (default: false)',
                            default: false
                        },
                        mode: {
                            type: 'string',
                            enum: ['auto', 'camera', 'canvas'],
                            description: 'Capture mode: "camera" (pure game camera render without editor grid/gizmos), "canvas" (full editor canvas), or "auto" (default: auto)',
                            default: 'auto'
                        }
                    }
                }
            },
            {
                name: 'query_state',
                description: 'GAMEPLAY STATE INSPECTOR: Inspects runtime game state: active scene name, canvas dimensions, pause status, and scans all active interactable buttons with their screen coordinates. Can also evaluate a custom JS expression.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        evalExpr: {
                            type: 'string',
                            description: 'Optional JavaScript expression to evaluate in the game runtime context (e.g. "window.GameManager ? window.GameManager.score : null")'
                        },
                        includeUiNodes: {
                            type: 'boolean',
                            description: 'Whether to scan and return all active UI buttons with screen positions (default: true)',
                            default: true
                        }
                    }
                }
            },
            {
                name: 'eval',
                description: 'EXECUTE RUNTIME CODE: Evaluates arbitrary JavaScript code inside the running Cocos Creator engine context. Has direct access to cc, cc.director, cc.game, window globals, and active components.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: {
                            type: 'string',
                            description: 'JavaScript code to execute in the scene runtime (e.g. "cc.director.getScene().name")'
                        }
                    },
                    required: ['code']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'tap':
                return await this.handleTap(args);
            case 'swipe':
                return await this.handleSwipe(args);
            case 'tap_node':
                return await this.handleTapNode(args);
            case 'screenshot':
                return await this.handleScreenshot(args);
            case 'query_state':
                return await this.handleQueryState(args);
            case 'eval':
                return await this.handleEval(args);
            default:
                throw new Error(`Unknown gameplay tool: ${toolName}`);
        }
    }

    private async callSceneScript(method: string, scriptArgs: any[]): Promise<ToolResponse> {
        try {
            const options = {
                name: SCENE_SCRIPT_TARGET,
                method: method,
                args: scriptArgs
            };
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', options);
            if (result && result.success !== undefined) {
                return result;
            }
            return {
                success: true,
                data: result,
                message: `Scene script ${method} executed`
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to execute ${method}: ${err.message}`
            };
        }
    }

    private async handleTap(args: any): Promise<ToolResponse> {
        const { x, y, duration = 50, origin = 'bottom-left' } = args;
        return await this.callSceneScript('gameTap', [x, y, duration, origin]);
    }

    private async handleSwipe(args: any): Promise<ToolResponse> {
        const { startX, startY, endX, endY, duration = 200, steps = 8, origin = 'bottom-left' } = args;
        return await this.callSceneScript('gameSwipe', [startX, startY, endX, endY, duration, steps, origin]);
    }

    private async handleTapNode(args: any): Promise<ToolResponse> {
        const { target } = args;
        return await this.callSceneScript('gameTapNode', [target]);
    }

    private async handleScreenshot(args: any): Promise<ToolResponse> {
        const { savePath, returnBase64 = false, mode = 'auto' } = args;
        return await this.callSceneScript('gameScreenshot', [savePath, returnBase64, mode]);
    }

    private async handleQueryState(args: any): Promise<ToolResponse> {
        const { evalExpr, includeUiNodes = true } = args;
        return await this.callSceneScript('gameQueryState', [evalExpr, includeUiNodes]);
    }

    private async handleEval(args: any): Promise<ToolResponse> {
        const { code } = args;
        return await this.callSceneScript('gameEval', [code]);
    }
}
