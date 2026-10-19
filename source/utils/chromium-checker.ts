import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ChromiumInfo {
    installed: boolean;
    executablePath: string | null;
    version?: string;
    installCommand: string;
}

/**
 * Searches for Chromium installed via Playwright across common operating system cache directories.
 */
export function findInstalledChromium(): string | null {
    try {
        // 1. Try playwright-core default executablePath if available and valid
        try {
            const { chromium } = require('playwright-core');
            const defaultPath = chromium.executablePath();
            if (defaultPath && fs.existsSync(defaultPath)) {
                return defaultPath;
            }
        } catch {}

        // 2. Search platform-specific ms-playwright directories
        const platform = os.platform();
        const candidateRoots: string[] = [];

        if (platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
            candidateRoots.push(path.join(localAppData, 'ms-playwright'));
        } else if (platform === 'darwin') {
            candidateRoots.push(path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'));
        } else {
            // Linux and others
            candidateRoots.push(path.join(os.homedir(), '.cache', 'ms-playwright'));
        }

        for (const root of candidateRoots) {
            if (!fs.existsSync(root)) continue;

            const entries = fs.readdirSync(root);
            // Sort in descending order to prefer newer versions e.g. chromium-1248 over chromium-1243
            const chromiumDirs = entries
                .filter(name => name.startsWith('chromium-'))
                .sort()
                .reverse();

            for (const dirName of chromiumDirs) {
                const dirPath = path.join(root, dirName);
                if (platform === 'win32') {
                    const candidate = path.join(dirPath, 'chrome-win64', 'chrome.exe');
                    if (fs.existsSync(candidate)) return candidate;
                    const altCandidate = path.join(dirPath, 'chrome-win', 'chrome.exe');
                    if (fs.existsSync(altCandidate)) return altCandidate;
                } else if (platform === 'darwin') {
                    const candidate = path.join(dirPath, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
                    if (fs.existsSync(candidate)) return candidate;
                } else {
                    const candidate = path.join(dirPath, 'chrome-linux', 'chrome');
                    if (fs.existsSync(candidate)) return candidate;
                }
            }
        }

        // 3. Fallback check for standard Chrome / Edge on Windows
        if (platform === 'win32') {
            const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
            const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
            const sysCandidates = [
                path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
                path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
                path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
                path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
            ];
            for (const sc of sysCandidates) {
                if (fs.existsSync(sc)) return sc;
            }
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Checks whether Chromium is installed and ready for Playwright automation.
 */
export function isChromiumAvailable(): boolean {
    return findInstalledChromium() !== null;
}

/**
 * Returns detailed diagnostic information about the Chromium installation status.
 */
export function getChromiumInfo(): ChromiumInfo {
    const execPath = findInstalledChromium();
    return {
        installed: execPath !== null,
        executablePath: execPath,
        installCommand: 'npx playwright install chromium'
    };
}
