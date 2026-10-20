import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { BrowserTestingDriver } from './browser-driver';
import { isChromiumAvailable, getChromiumInfo } from '../utils/chromium-checker';

export class BrowserTools implements ToolExecutor {
    private driver: BrowserTestingDriver = BrowserTestingDriver.getInstance();

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'browser_manage',
                description: 'CHROMIUM GAME TESTING DRIVER (Playwright): Automate end-to-end browser gameplay testing on Cocos Creator web preview. Supports canvas taps, drag gestures, runtime JS evaluation, visual screenshot capture, and console monitoring.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['status', 'launch', 'navigate', 'tap', 'swipe', 'tap_node', 'swipe_nodes', 'load_scene', 'eval', 'screenshot', 'get_logs', 'close'],
                            description: 'Browser testing action opcode: "status" = check Chromium/session state | "launch" = start Chromium preview browser | "navigate" = load preview URL | "tap" = click canvas | "swipe" = touch drag gesture | "tap_node" = click target node via camera/screen mapping | "swipe_nodes" = drag between two nodes | "load_scene" = switch scene directly | "eval" = execute JS in browser | "screenshot" = capture viewport | "get_logs" = fetch console telemetry | "close" = stop session'
                        },
                        headless: {
                            type: 'boolean',
                            default: false,
                            description: 'Whether to run Chromium in headless mode (default: false for visual inspection)'
                        },
                        url: {
                            type: 'string',
                            default: 'http://127.0.0.1:7456',
                            description: 'Target game preview URL (default: http://127.0.0.1:7456)'
                        },
                        viewportWidth: {
                            type: 'number',
                            default: 1280,
                            description: 'Browser viewport width in pixels (default: 1280)'
                        },
                        viewportHeight: {
                            type: 'number',
                            default: 720,
                            description: 'Browser viewport height in pixels (default: 720)'
                        },
                        mobile: {
                            type: 'boolean',
                            default: false,
                            description: 'Emulate mobile device touch screen and viewport (default: false)'
                        },
                        waitForEngine: {
                            type: 'boolean',
                            default: true,
                            description: 'Wait for Cocos Creator engine (window.cc) to initialize before returning (default: true)'
                        },
                        x: {
                            type: 'number',
                            description: 'Target X coordinate for tap (pixel coordinate e.g. 640 or normalized 0.0 - 1.0)'
                        },
                        y: {
                            type: 'number',
                            description: 'Target Y coordinate for tap (pixel coordinate e.g. 360 or normalized 0.0 - 1.0)'
                        },
                        startX: {
                            type: 'number',
                            description: 'Swipe start X coordinate (pixel or normalized 0.0 - 1.0)'
                        },
                        startY: {
                            type: 'number',
                            description: 'Swipe start Y coordinate (pixel or normalized 0.0 - 1.0)'
                        },
                        endX: {
                            type: 'number',
                            description: 'Swipe end X coordinate (pixel or normalized 0.0 - 1.0)'
                        },
                        endY: {
                            type: 'number',
                            description: 'Swipe end Y coordinate (pixel or normalized 0.0 - 1.0)'
                        },
                        duration: {
                            type: 'number',
                            default: 200,
                            description: 'Swipe duration in milliseconds (default: 200)'
                        },
                        steps: {
                            type: 'number',
                            default: 8,
                            description: 'Intermediate mouse move steps for swipe (default: 8)'
                        },
                        nodePath: {
                            type: 'string',
                            description: 'Target node path in active scene (e.g. "Canvas/StartBtn" or "StartBtn") for tap_node'
                        },
                        startNode: {
                            type: 'string',
                            description: 'Starting node path for swipe_nodes action'
                        },
                        endNode: {
                            type: 'string',
                            description: 'Ending node path for swipe_nodes action'
                        },
                        scene: {
                            type: 'string',
                            description: 'Target scene name or asset path (e.g. "game" or "db://assets/scenes/game.scene") for load_scene'
                        },
                        code: {
                            type: 'string',
                            description: 'JavaScript code expression to evaluate inside game runtime context (e.g. "cc.director.getScene()?.name")'
                        },
                        savePath: {
                            type: 'string',
                            description: 'Absolute file path to save captured PNG screenshot. Defaults to project temp folder.'
                        },
                        returnBase64: {
                            type: 'boolean',
                            default: false,
                            description: 'Whether to include base64 encoded image string in response (default: false)'
                        },
                        clearLogs: {
                            type: 'boolean',
                            default: false,
                            description: 'Clear collected console logs after fetching (get_logs action)'
                        },
                        logLevelFilter: {
                            type: 'string',
                            enum: ['error', 'warning', 'log', 'info'],
                            description: 'Optional filter for log level (get_logs action)'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        const action = args?.action || toolName.replace('browser_', '');

        if (action === 'status') {
            return await this.handleStatus();
        }

        // Check if Chromium is installed before attempting browser interactions
        if (!isChromiumAvailable()) {
            const info = getChromiumInfo();
            return {
                success: false,
                error: `Chromium is not installed. Run "${info.installCommand}" to enable automated game testing in Chromium.`
            };
        }

        switch (action) {
            case 'launch':
                return await this.handleLaunch(args);
            case 'navigate':
                return await this.handleNavigate(args);
            case 'tap':
                return await this.handleTap(args);
            case 'swipe':
                return await this.handleSwipe(args);
            case 'tap_node':
                return await this.handleTapNode(args);
            case 'swipe_nodes':
                return await this.handleSwipeNodes(args);
            case 'load_scene':
                return await this.handleLoadScene(args);
            case 'eval':
                return await this.handleEval(args);
            case 'screenshot':
                return await this.handleScreenshot(args);
            case 'get_logs':
                return await this.handleGetLogs(args);
            case 'close':
                return await this.handleClose();
            default:
                throw new Error(`Unknown browser action: ${action}`);
        }
    }

    private async handleStatus(): Promise<ToolResponse> {
        try {
            const status = await this.driver.getStatus();
            return {
                success: true,
                message: status.running
                    ? `Browser active on ${status.currentUrl} (Scene: "${status.currentScene || 'Loading'}")`
                    : `Browser offline. Chromium installed: ${status.chromium.installed ? 'YES' : 'NO'}`,
                data: status
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleLaunch(args: any): Promise<ToolResponse> {
        try {
            const width = typeof args?.viewportWidth === 'number' ? args.viewportWidth : 1280;
            const height = typeof args?.viewportHeight === 'number' ? args.viewportHeight : 720;
            const status = await this.driver.launch({
                headless: args?.headless ?? false,
                url: args?.url || 'http://127.0.0.1:7456',
                viewport: { width, height },
                mobile: args?.mobile ?? false,
                waitForEngine: args?.waitForEngine !== false,
                timeout: args?.timeout
            });

            return {
                success: true,
                message: `Chromium launched successfully. Connected to ${status.currentUrl}`,
                data: status
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleNavigate(args: any): Promise<ToolResponse> {
        try {
            const url = args?.url || 'http://127.0.0.1:7456';
            const status = await this.driver.navigate(url, args?.waitForEngine !== false, args?.timeout);
            return {
                success: true,
                message: `Navigated to ${url}. Engine ready: ${status.engineReady}`,
                data: status
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleTap(args: any): Promise<ToolResponse> {
        try {
            if (args?.x === undefined || args?.y === undefined) {
                return { success: false, error: 'Parameters "x" and "y" are required for tap action' };
            }
            const res = await this.driver.tap(args.x, args.y, {
                button: args?.button,
                delay: args?.delay
            });
            return { success: true, message: res.message, data: res };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleSwipe(args: any): Promise<ToolResponse> {
        try {
            if (args?.startX === undefined || args?.startY === undefined || args?.endX === undefined || args?.endY === undefined) {
                return { success: false, error: 'Parameters "startX", "startY", "endX", and "endY" are required for swipe action' };
            }
            const res = await this.driver.swipe(
                args.startX,
                args.startY,
                args.endX,
                args.endY,
                args?.duration || 200,
                args?.steps || 8
            );
            return { success: true, message: res.message, data: res };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleTapNode(args: any): Promise<ToolResponse> {
        try {
            const nodePath = args?.nodePath || args?.path || args?.targetNode;
            if (!nodePath) {
                return { success: false, error: 'Parameter "nodePath" is required for tap_node action' };
            }
            const res = await this.driver.tapNode(nodePath, {
                doubleClick: args?.doubleClick,
                delay: args?.delay
            });
            return { success: true, message: res.message, data: res };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleSwipeNodes(args: any): Promise<ToolResponse> {
        try {
            const startNode = args?.startNode || args?.startNodePath;
            const endNode = args?.endNode || args?.endNodePath;
            if (!startNode || !endNode) {
                return { success: false, error: 'Parameters "startNode" and "endNode" are required for swipe_nodes action' };
            }
            const res = await this.driver.swipeNodes(
                startNode,
                endNode,
                args?.duration || 250,
                args?.steps || 8
            );
            return { success: true, message: res.message, data: res };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleLoadScene(args: any): Promise<ToolResponse> {
        try {
            const sceneName = args?.scene || args?.sceneName || args?.target;
            if (!sceneName) {
                return { success: false, error: 'Parameter "scene" is required for load_scene action' };
            }
            const res = await this.driver.loadScene(sceneName);
            return {
                success: res.success !== false,
                message: res.message || `Loaded scene "${sceneName}"`,
                data: res
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleEval(args: any): Promise<ToolResponse> {
        try {
            const code = args?.code && args.code.trim() ? args.code : 'cc.director.getScene()?.name || "Scene Loaded"';
            const res = await this.driver.evaluate(code);
            return {
                success: res.success !== false,
                message: `Evaluated code in browser context`,
                data: res
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleScreenshot(args: any): Promise<ToolResponse> {
        try {
            const res = await this.driver.screenshot(args?.savePath, args?.returnBase64, args?.fullPage);
            return {
                success: true,
                message: res.message,
                data: res
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleGetLogs(args: any): Promise<ToolResponse> {
        try {
            const logs = this.driver.getLogs(args?.clearLogs ?? false, args?.logLevelFilter);
            return {
                success: true,
                message: `Retrieved ${logs.length} browser log entries`,
                data: { logs, count: logs.length }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async handleClose(): Promise<ToolResponse> {
        try {
            const res = await this.driver.close();
            return { success: true, message: res.message };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
