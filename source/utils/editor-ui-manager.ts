import * as path from 'path';
import * as fs from 'fs';

function getElectron(): any {
    try {
        return require('electron');
    } catch (e) {
        throw new Error('Electron runtime is unavailable in current execution context.');
    }
}

function getAllWindows(): any[] {
    const el = getElectron();
    if (!el || !el.BrowserWindow) return [];
    return el.BrowserWindow.getAllWindows().filter((w: any) => w && !w.isDestroyed());
}

function getWindowUrl(win: any): string {
    return win && win.webContents && typeof win.webContents.getURL === 'function' ? win.webContents.getURL() : '';
}

function getMainWindow(): any {
    const wins = getAllWindows().filter((w) => /^file:\/\/.*\/windows\/main\.html(?:[?#]|$)/i.test(getWindowUrl(w)));
    if (wins.length === 1) return wins[0];
    const anyWin = getAllWindows().find((w) => getWindowUrl(w).includes('main.html'));
    if (anyWin) return anyWin;
    throw new Error('Cocos Creator main editor window could not be uniquely identified.');
}

function getWindowKind(win: any): string {
    const title = String((win.getTitle && win.getTitle()) || '').toLowerCase();
    if (title.includes('simulator')) return 'simulator';
    if (title.includes('preview')) return 'preview';
    return 'other';
}

function findWindowOfKind(kind: string): any {
    const win = getAllWindows().find((w) => getWindowKind(w) === kind);
    if (!win) throw new Error(`No open ${kind} window was found.`);
    return win;
}

function panelFrameScript(panelName: string): string {
    return `
    (() => {
      const name = ${JSON.stringify(String(panelName))};
      const collect = (root, bucket) => {
        for (const n of (root.querySelectorAll ? root.querySelectorAll('panel-frame') : [])) bucket.push(n);
        for (const n of (root.querySelectorAll ? root.querySelectorAll('*') : [])) if (n.shadowRoot) collect(n.shadowRoot, bucket);
      };
      const frames = [];
      collect(document, frames);
      const hit = frames.map((f) => ({ f, r: f.getBoundingClientRect() }))
        .find(({ f, r }) => f.getAttribute('name') === name && r.width > 4 && r.height > 4);
      if (!hit) return null;
      return { x: Math.max(0, Math.floor(hit.r.left)), y: Math.max(0, Math.floor(hit.r.top)),
        width: Math.floor(hit.r.width), height: Math.floor(hit.r.height) };
    })();`;
}

function panelBoundsScript(panelName: string): string {
    return `
    (() => {
      const panelName = ${JSON.stringify(String(panelName).toLowerCase())};
      const isVisible = (el) => {
        if (!el || typeof el.getBoundingClientRect !== 'function') return false;
        const style = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return style && style.display !== 'none' && style.visibility !== 'hidden' && r.width > 4 && r.height > 4;
      };
      const textOf = (el) => [el.getAttribute && el.getAttribute('name'), el.getAttribute && el.getAttribute('title'),
        el.id, el.className, el.textContent].filter(Boolean).join(' ').toLowerCase();
      const collect = (root, bucket) => {
        if (!root) return;
        for (const n of (root.querySelectorAll ? root.querySelectorAll('*') : [])) {
          bucket.push(n);
          if (n.shadowRoot) collect(n.shadowRoot, bucket);
        }
      };
      const all = [];
      collect(document, all);
      const score = (el) => {
        const t = textOf(el);
        let s = 0;
        if (t.includes(panelName)) s += 100;
        if (t.includes('panel-frame')) s += 5;
        if (panelName === 'scene' && t.includes('game')) s -= 10;
        if (panelName === 'game' && t.includes('scene')) s -= 10;
        return s;
      };
      const largestChild = (el) => {
        const bucket = [el];
        if (el.shadowRoot) collect(el.shadowRoot, bucket);
        return bucket.filter(isVisible).map((n) => {
          const r = n.getBoundingClientRect();
          const t = textOf(n);
          let s = r.width * r.height;
          if (n.tagName && n.tagName.toLowerCase() === 'canvas') s += 50000;
          if (t.includes(panelName)) s += 20000;
          if (t.includes('canvas') || t.includes('preview') || t.includes('viewport')) s += 10000;
          return { rect: r, score: s };
        }).sort((a, b) => b.score - a.score)[0] || null;
      };
      const candidates = all.filter(isVisible).map((el) => {
        const ps = score(el);
        if (ps <= 0) return null;
        const inner = largestChild(el) || { rect: el.getBoundingClientRect(), score: 0 };
        return { score: ps + inner.score, rect: inner.rect };
      }).filter(Boolean).sort((a, b) => b.score - a.score);
      const canvases = all.filter((el) => isVisible(el) && el.tagName && el.tagName.toLowerCase() === 'canvas')
        .map((el) => { const r = el.getBoundingClientRect(); return { score: r.width * r.height + (textOf(el).includes(panelName) ? 50000 : 0), rect: r }; })
        .sort((a, b) => b.score - a.score);
      const target = candidates[0] || canvases[0];
      if (!target) return null;
      return { x: Math.max(0, Math.floor(target.rect.left)), y: Math.max(0, Math.floor(target.rect.top)),
        width: Math.max(1, Math.floor(target.rect.width)), height: Math.max(1, Math.floor(target.rect.height)) };
    })();`;
}

const PANEL_TARGETS = ['scene', 'hierarchy', 'inspector', 'assets', 'console'];

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))
    ]);
}

function findGameViewContents(): any {
    const el = getElectron();
    if (!el || !el.webContents) return null;
    return el.webContents.getAllWebContents().find((wc: any) =>
        !wc.isDestroyed() && wc.getType() === 'webview'
        && /[\\/]preload[\\/]web[\\/]preview\.js$/i.test(decodeURIComponent(wc.getURL()))
    );
}

async function captureGameView(): Promise<any> {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
        const wc = findGameViewContents();
        if (wc) {
            const image: any = await withTimeout(wc.capturePage(), 3000, 'Capturing the Game View timed out.');
            const size = image.getSize();
            if (size.width > 32 && size.height > 32) return image;
        }
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error('The in-editor Game View was not found or is not currently active.');
}

export interface ScreenshotResult {
    target: string;
    file: string;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
    windowTitle: string;
    __image: {
        data: string;
        mimeType: string;
    };
}

export class EditorUiManager {
    public static async captureScreenshot(target: string = 'scene', maxWidth: number = 1280): Promise<ScreenshotResult> {
        let win: any;
        let bounds: any = null;
        let image: any;
        let title: string = '';

        if (target === 'game') {
            const state = await this.executePreviewCommand({ action: 'state' });
            if (!state.running) {
                throw new Error('No in-editor Game View preview is running. Start preview first via project_manage(action="preview_start").');
            }
            image = await captureGameView();
            title = 'Game View';
        } else if (target === 'preview' || target === 'simulator') {
            win = findWindowOfKind(target);
            title = win.getTitle ? win.getTitle() : target;
            image = await withTimeout(win.capturePage(), 5000, `Capturing ${target} window timed out.`);
        } else {
            win = getMainWindow();
            title = win.getTitle ? win.getTitle() : 'Cocos Creator';
            if (PANEL_TARGETS.includes(target)) {
                bounds = await win.webContents.executeJavaScript(panelFrameScript(target), true)
                    || await win.webContents.executeJavaScript(panelBoundsScript(target), true);
                if (!bounds) {
                    throw new Error(`Could not locate visible '${target}' panel inside editor window.`);
                }
            }
            image = await withTimeout(bounds ? win.capturePage(bounds) : win.capturePage(), 5000, `Capturing '${target}' panel timed out.`);
        }

        const originalSize = image.getSize();
        if (maxWidth && originalSize.width > maxWidth) {
            image = image.resize({ width: maxWidth, quality: 'good' });
        }

        const pngBuffer = image.toPNG();
        const base64Data = pngBuffer.toString('base64');
        const finalSize = image.getSize();

        const projectPath = Editor.Project ? Editor.Project.path : process.cwd();
        const outputDir = path.join(projectPath, 'temp', 'pts-cc-mcp', 'captures');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const filePath = path.join(outputDir, `${target}-${Date.now()}.png`);
        fs.writeFileSync(filePath, pngBuffer);

        return {
            target,
            file: filePath,
            width: finalSize.width,
            height: finalSize.height,
            sourceWidth: originalSize.width,
            sourceHeight: originalSize.height,
            windowTitle: title,
            __image: {
                data: base64Data,
                mimeType: 'image/png'
            }
        };
    }

    public static async executePreviewCommand(command: {
        action: 'state' | 'start' | 'stop' | 'pause' | 'resume';
        mode?: 'gameView' | 'browser' | 'simulator';
    }): Promise<any> {
        const previewToolbarScript = `
        (async (command) => {
            const toolbar = document.querySelector('#toolbar');
            const panels = toolbar ? Array.from(toolbar.querySelectorAll('ui-panel')) : [];
            const candidates = panels.filter((panel) => /\\/builtin\\/preview\\/static\\/toolbar\\/middle\\.js$/.test(
                String(panel.getAttribute('src') || '').replace(/\\\\/g, '/')));
            const panel = candidates.length === 1 ? candidates[0] : null;
            const root = panel && (panel.shadowRoot || panel);
            const element = root && root.querySelector('.preview-info-wrap');
            const vm = element && element.__vue__;
            if (!vm || !vm.gameView || typeof vm.gameView.isPlay !== 'boolean' || typeof vm.gameView.isPaused !== 'boolean'
                || !['play', 'changePlatform', 'gameViewPause'].every((key) => typeof vm[key] === 'function')) {
                throw new Error('The Cocos Creator preview toolbar is unavailable. Please ensure the main editor window is active.');
            }
            if (!['state', 'start', 'stop', 'pause', 'resume'].includes(command.action)
                || (command.action === 'start' && !['browser', 'gameView', 'simulator'].includes(command.mode))) {
                throw new Error('Unsupported preview command or mode.');
            }
            const lock = Symbol.for('pts-cc-mcp.preview-operation');
            const busy = () => Boolean(vm[lock] || vm.isPlaying || vm.isLoading || vm.gameView.isStep);
            const readPreview = async () => {
                const paused = await Editor.Message.request('scene', 'editor-preview-call-method', 'isPause');
                if (paused != null && typeof paused !== 'boolean') throw new Error('Unsupported preview state returned.');
                return { running: typeof paused === 'boolean', paused: paused === true };
            };
            const snapshot = (state) => ({ mode: vm.currPlatform, running: state.running, paused: state.paused, busy: busy() });
            if (command.action === 'state') return snapshot(await readPreview());
            if (busy()) throw new Error('Preview toolbar is busy. Please wait for current operation to complete.');

            vm[lock] = true;
            try {
                const before = await readPreview();
                const changeMode = async (mode) => {
                    await vm.changePlatform(mode);
                    await Editor.Profile.setConfig('preview', 'preview.current.platform', mode, 'local');
                    if (vm.currPlatform !== mode) throw new Error('Editor did not select preview mode: ' + mode);
                };
                vm.gameView.isPlay = before.running;
                vm.gameView.isPaused = before.paused;

                if (command.action === 'start') {
                    if (before.running && command.mode === 'gameView') return Object.assign(snapshot(before), { changed: false });
                    if (before.running) {
                        await vm.play();
                        vm.gameView.isPlay = false;
                        vm.gameView.isPaused = false;
                    }
                    if (vm.currPlatform !== command.mode) await changeMode(command.mode);
                    await vm.play();
                    if (command.mode === 'gameView' && !(await readPreview()).running) {
                        throw new Error('Editor rejected Game View preview start.');
                    }
                } else if (command.action === 'stop') {
                    if (!before.running) return Object.assign(snapshot(before), { changed: false });
                    await vm.play();
                    if ((await readPreview()).running) throw new Error('Editor rejected Game View preview stop.');
                    vm.gameView.isPlay = false;
                    vm.gameView.isPaused = false;
                } else {
                    if (!before.running) throw new Error('Game View preview is not currently running.');
                    const wantPaused = command.action === 'pause';
                    if (before.paused !== wantPaused) await vm.gameViewPause();
                    const after = await readPreview();
                    if (after.paused !== wantPaused) throw new Error('Editor did not ' + command.action + ' Game View preview.');
                }
                const after = await readPreview();
                return Object.assign(snapshot(after), { changed: before.running !== after.running || before.paused !== after.paused });
            } finally {
                delete vm[lock];
            }
        })(${JSON.stringify(command)})`;

        const win = getMainWindow();
        return await win.webContents.executeJavaScript(previewToolbarScript, true);
    }
}
