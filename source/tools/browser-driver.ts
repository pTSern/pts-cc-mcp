import * as fs from 'fs';
import * as path from 'path';
import { findInstalledChromium, getChromiumInfo, ChromiumInfo } from '../utils/chromium-checker';

declare const Editor: any;

export interface BrowserLaunchOptions {
    headless?: boolean;
    url?: string;
    viewport?: { width: number; height: number };
    mobile?: boolean;
    waitForEngine?: boolean;
    timeout?: number;
}

export interface BrowserLogEntry {
    type: string;
    text: string;
    timestamp: string;
}

export class BrowserTestingDriver {
    private static instance: BrowserTestingDriver;
    private browser: any = null;
    private context: any = null;
    private page: any = null;
    private logs: BrowserLogEntry[] = [];
    private activeUrl: string = '';
    private activeViewport: { width: number; height: number } = { width: 1280, height: 720 };

    public static getInstance(): BrowserTestingDriver {
        if (!BrowserTestingDriver.instance) {
            BrowserTestingDriver.instance = new BrowserTestingDriver();
        }
        return BrowserTestingDriver.instance;
    }

    private getProjectPath(): string {
        if (typeof Editor !== 'undefined' && (Editor as any)?.Project?.path) {
            return (Editor as any).Project.path;
        }
        return process.cwd();
    }

    public async getStatus(): Promise<any> {
        const chromiumInfo = getChromiumInfo();
        let engineReady = false;
        let currentScene = '';

        if (this.page && !this.page.isClosed()) {
            try {
                const engineState = await this.page.evaluate(() => {
                    const cc = (window as any).cc;
                    if (cc && cc.director) {
                        const scene = cc.director.getScene();
                        return {
                            ready: true,
                            sceneName: scene ? scene.name : 'No Active Scene'
                        };
                    }
                    return { ready: false, sceneName: '' };
                });
                engineReady = engineState.ready;
                currentScene = engineState.sceneName;
            } catch {}
        }

        return {
            running: this.browser !== null && this.page !== null && !this.page.isClosed(),
            chromium: chromiumInfo,
            currentUrl: this.activeUrl,
            viewport: this.activeViewport,
            engineReady,
            currentScene,
            logCount: this.logs.length
        };
    }

    public async launch(options: BrowserLaunchOptions = {}): Promise<any> {
        const execPath = findInstalledChromium();
        if (!execPath) {
            throw new Error('Chromium executable not found. Please install Playwright Chromium by running: npx playwright install chromium');
        }

        // Close any existing session before launching a fresh one
        if (this.browser) {
            await this.close();
        }

        const { chromium } = require('playwright-core');
        const headless = options.headless ?? false;
        const viewport = options.viewport || { width: 1280, height: 720 };
        this.activeViewport = viewport;

        this.browser = await chromium.launch({
            executablePath: execPath,
            headless: headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--autoplay-policy=no-user-gesture-required'
            ]
        });

        this.context = await this.browser.newContext({
            viewport: viewport,
            isMobile: options.mobile ?? false,
            hasTouch: options.mobile ?? false,
            deviceScaleFactor: 1
        });

        this.page = await this.context.newPage();
        this.logs = [];

        // Attach console telemetry listener
        this.page.on('console', (msg: any) => {
            this.logs.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date().toISOString()
            });
            // Cap logs at 500 entries to prevent memory leak
            if (this.logs.length > 500) {
                this.logs.shift();
            }
        });

        this.page.on('pageerror', (err: any) => {
            this.logs.push({
                type: 'error',
                text: `[PageError] ${err.message || String(err)}`,
                timestamp: new Date().toISOString()
            });
        });

        const targetUrl = options.url || 'http://127.0.0.1:7456';
        await this.navigate(targetUrl, options.waitForEngine !== false, options.timeout || 30000);

        return await this.getStatus();
    }

    public async navigate(url: string, waitForEngine: boolean = true, timeoutMs: number = 30000): Promise<any> {
        if (!this.page || this.page.isClosed()) {
            throw new Error('Browser is not running. Call launch action first.');
        }

        this.activeUrl = url;
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

        if (waitForEngine) {
            await this.waitForCocosEngine(timeoutMs);
        }

        return await this.getStatus();
    }

    public async waitForCocosEngine(timeoutMs: number = 15000): Promise<boolean> {
        if (!this.page || this.page.isClosed()) return false;

        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const isReady = await this.page.evaluate(() => {
                    const cc = (window as any).cc;
                    return typeof cc !== 'undefined' && cc.director && cc.director.getScene() !== null;
                });
                if (isReady) return true;
            } catch {}
            await new Promise(res => setTimeout(res, 500));
        }
        return false;
    }

    public async tap(x: number, y: number, options: { button?: 'left' | 'right' | 'middle'; delay?: number } = {}): Promise<any> {
        if (!this.page || this.page.isClosed()) {
            throw new Error('Browser is not running. Call launch action first.');
        }

        // Convert normalized coordinates (0.0 - 1.0) to screen pixel coordinates
        let pixelX = x;
        let pixelY = y;
        if (x >= 0 && x <= 1.0 && y >= 0 && y <= 1.0) {
            pixelX = Math.round(x * this.activeViewport.width);
            pixelY = Math.round(y * this.activeViewport.height);
        }

        await this.page.mouse.click(pixelX, pixelY, {
            button: options.button || 'left',
            delay: options.delay || 50
        });

        return {
            success: true,
            tappedCoordinates: { x: pixelX, y: pixelY },
            message: `Clicked at (${pixelX}, ${pixelY})`
        };
    }

    public async swipe(startX: number, startY: number, endX: number, endY: number, durationMs: number = 200, steps: number = 8): Promise<any> {
        if (!this.page || this.page.isClosed()) {
            throw new Error('Browser is not running. Call launch action first.');
        }

        let pStartX = startX;
        let pStartY = startY;
        let pEndX = endX;
        let pEndY = endY;

        if (startX >= 0 && startX <= 1.0 && startY >= 0 && startY <= 1.0) {
            pStartX = Math.round(startX * this.activeViewport.width);
            pStartY = Math.round(startY * this.activeViewport.height);
        }
        if (endX >= 0 && endX <= 1.0 && endY >= 0 && endY <= 1.0) {
            pEndX = Math.round(endX * this.activeViewport.width);
            pEndY = Math.round(endY * this.activeViewport.height);
        }

        await this.page.mouse.move(pStartX, pStartY);
        await this.page.mouse.down();

        const stepCount = Math.max(2, steps);
        const stepDelay = durationMs / stepCount;

        for (let i = 1; i <= stepCount; i++) {
            const currentX = pStartX + (pEndX - pStartX) * (i / stepCount);
            const currentY = pStartY + (pEndY - pStartY) * (i / stepCount);
            await this.page.mouse.move(currentX, currentY);
            if (stepDelay > 0) {
                await new Promise(res => setTimeout(res, stepDelay));
            }
        }

        await this.page.mouse.up();

        return {
            success: true,
            gesture: { start: { x: pStartX, y: pStartY }, end: { x: pEndX, y: pEndY }, durationMs, steps: stepCount },
            message: `Swiped from (${pStartX}, ${pStartY}) to (${pEndX}, ${pEndY}) over ${durationMs}ms`
        };
    }

    public async evaluate(code: string): Promise<any> {
        if (!this.page || this.page.isClosed()) {
            throw new Error('Browser is not running. Call launch action first.');
        }

        const result = await this.page.evaluate((userCode: string) => {
            try {
                // Execute code in browser window context
                const evalFn = new Function('cc', 'window', 'document', `return (${userCode});`);
                const val = evalFn((window as any).cc, window, document);
                return { success: true, value: val };
            } catch (err: any) {
                return { success: false, error: err.message || String(err) };
            }
        }, code);

        return result;
    }

    public async getNodeClientCoordinates(nodePath: string): Promise<any> {
        if (!this.page || this.page.isClosed()) {
            throw new Error('Browser is not running. Call launch action first.');
        }

        const res = await this.page.evaluate((targetPath: string) => {
            try {
                const cc = (window as any).cc;
                if (!cc) return { success: false, error: 'Cocos engine not initialized' };

                let targetNode = cc.find(targetPath);
                if (!targetNode) {
                    const scene = cc.director?.getScene?.();
                    if (scene) {
                        const cleanTarget = targetPath.split('/').pop()?.toLowerCase();
                        const search = (node: any): any => {
                            if (node.name.toLowerCase() === cleanTarget) return node;
                            for (const c of node.children) {
                                const found = search(c);
                                if (found) return found;
                            }
                            return null;
                        };
                        targetNode = search(scene);
                    }
                }

                if (!targetNode) {
                    return { success: false, error: `Node not found in scene: "${targetPath}"` };
                }

                const canvas = document.querySelector('canvas') || document.querySelector('#GameCanvas');
                if (!canvas) {
                    return { success: false, error: 'HTML canvas element not found in DOM' };
                }
                const rect = canvas.getBoundingClientRect();

                let screenX = 0;
                let screenY = 0;

                const camera = cc.Camera?.findCamera ? cc.Camera.findCamera(targetNode) : null;
                const activeCamera = camera || (cc.director?.getScene?.()?.getComponentInChildren?.(cc.Camera));

                if (activeCamera && typeof activeCamera.worldToScreen === 'function') {
                    const screenPos = new cc.Vec3();
                    activeCamera.worldToScreen(targetNode.worldPosition, screenPos);
                    screenX = screenPos.x;
                    screenY = screenPos.y;
                } else {
                    screenX = targetNode.worldPosition.x;
                    screenY = targetNode.worldPosition.y;
                }

                const canvasWidth = canvas.width || rect.width;
                const canvasHeight = canvas.height || rect.height;

                const clientX = rect.left + (screenX / canvasWidth) * rect.width;
                const clientY = rect.top + ((canvasHeight - screenY) / canvasHeight) * rect.height;

                return {
                    success: true,
                    nodeName: targetNode.name,
                    worldPosition: {
                        x: Math.round(targetNode.worldPosition.x * 10) / 10,
                        y: Math.round(targetNode.worldPosition.y * 10) / 10,
                        z: Math.round(targetNode.worldPosition.z * 10) / 10
                    },
                    clientPosition: {
                        x: Math.round(clientX),
                        y: Math.round(clientY)
                    }
                };
            } catch (err: any) {
                return { success: false, error: err.message || String(err) };
            }
        }, nodePath);

        return res;
    }

    public async tapNode(nodePath: string, options: { doubleClick?: boolean; delay?: number } = {}): Promise<any> {
        const coords = await this.getNodeClientCoordinates(nodePath);
        if (!coords || !coords.success) {
            throw new Error(coords?.error || `Failed to find client coordinates for node: ${nodePath}`);
        }

        await this.tap(coords.clientPosition.x, coords.clientPosition.y, options);
        return {
            success: true,
            nodePath,
            nodeName: coords.nodeName,
            worldPosition: coords.worldPosition,
            clientPosition: coords.clientPosition,
            message: `Tapped node "${coords.nodeName}" at viewport (${coords.clientPosition.x}, ${coords.clientPosition.y})`
        };
    }

    public async swipeNodes(startNodePath: string, endNodePath: string, durationMs: number = 250, steps: number = 8): Promise<any> {
        const [startCoords, endCoords] = await Promise.all([
            this.getNodeClientCoordinates(startNodePath),
            this.getNodeClientCoordinates(endNodePath)
        ]);

        if (!startCoords || !startCoords.success) {
            throw new Error(startCoords?.error || `Failed to find start node: ${startNodePath}`);
        }
        if (!endCoords || !endCoords.success) {
            throw new Error(endCoords?.error || `Failed to find end node: ${endNodePath}`);
        }

        const swipeRes = await this.swipe(
            startCoords.clientPosition.x,
            startCoords.clientPosition.y,
            endCoords.clientPosition.x,
            endCoords.clientPosition.y,
            durationMs,
            steps
        );

        return {
            success: true,
            startNode: { path: startNodePath, name: startCoords.nodeName, coords: startCoords.clientPosition },
            endNode: { path: endNodePath, name: endCoords.nodeName, coords: endCoords.clientPosition },
            gesture: swipeRes.gesture,
            message: `Swiped from "${startCoords.nodeName}" (${startCoords.clientPosition.x}, ${startCoords.clientPosition.y}) to "${endCoords.nodeName}" (${endCoords.clientPosition.x}, ${endCoords.clientPosition.y})`
        };
    }

    public async loadScene(sceneName: string): Promise<any> {
        if (!this.page || this.page.isClosed()) {
            throw new Error('Browser is not running. Call launch action first.');
        }

        const res = await this.page.evaluate((targetScene: string) => {
            return new Promise((resolve) => {
                const cc = (window as any).cc;
                if (!cc || !cc.director) {
                    return resolve({ success: false, error: 'Cocos director not found in window context' });
                }

                let cleanName = targetScene;
                if (cleanName.includes('/')) {
                    cleanName = cleanName.split('/').pop() || cleanName;
                }
                if (cleanName.endsWith('.scene')) {
                    cleanName = cleanName.slice(0, -6);
                }

                cc.director.loadScene(cleanName, (err: any, loadedScene: any) => {
                    if (err) {
                        resolve({ success: false, error: err.message || String(err) });
                    } else {
                        resolve({
                            success: true,
                            sceneName: cleanName,
                            message: `Scene "${cleanName}" loaded successfully`
                        });
                    }
                });
            });
        }, sceneName);

        return res;
    }

    public async screenshot(savePath?: string, returnBase64: boolean = false, fullPage: boolean = false): Promise<any> {
        if (!this.page || this.page.isClosed()) {
            throw new Error('Browser is not running. Call launch action first.');
        }

        let targetPath = savePath;
        if (!targetPath) {
            const projectPath = this.getProjectPath();
            const tempDir = path.join(projectPath, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            targetPath = path.join(tempDir, `browser_capture_${Date.now()}.png`);
        } else {
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }

        await this.page.screenshot({
            path: targetPath,
            fullPage: fullPage
        });

        let base64Data: string | undefined = undefined;
        if (returnBase64 && fs.existsSync(targetPath)) {
            base64Data = fs.readFileSync(targetPath).toString('base64');
        }

        return {
            success: true,
            filePath: targetPath,
            ...(base64Data ? { base64: base64Data } : {}),
            message: `Screenshot captured successfully to ${targetPath}`
        };
    }

    public getLogs(clear: boolean = false, levelFilter?: string): BrowserLogEntry[] {
        let result = [...this.logs];
        if (levelFilter) {
            result = result.filter(log => log.type.toLowerCase() === levelFilter.toLowerCase());
        }
        if (clear) {
            this.logs = [];
        }
        return result;
    }

    public async close(): Promise<any> {
        try {
            if (this.page && !this.page.isClosed()) {
                await this.page.close().catch(() => {});
            }
            if (this.context) {
                await this.context.close().catch(() => {});
            }
            if (this.browser) {
                await this.browser.close().catch(() => {});
            }
        } finally {
            this.browser = null;
            this.context = null;
            this.page = null;
            this.activeUrl = '';
        }
        return { success: true, message: 'Browser session closed successfully' };
    }
}
