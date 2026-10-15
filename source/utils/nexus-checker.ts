import * as fs from 'fs';
import * as path from 'path';

declare const Editor: any;

/**
 * Checks whether the pts-nexus extension exists in the project and is enabled.
 * Returns false if:
 * 1. The extensions/pts-nexus directory or its package.json does not exist.
 * 2. The extension is disabled in profiles/v2/editor/packages.json under "disable-packages".
 */
export function isNexusAvailable(projectPath?: string): boolean {
    try {
        let root = projectPath;
        if (!root && typeof Editor !== 'undefined' && (Editor as any)?.Project?.path) {
            root = (Editor as any).Project.path;
        }
        if (!root) {
            let cur = __dirname;
            for (let i = 0; i < 5; i++) {
                if (fs.existsSync(path.join(cur, 'assets')) && fs.existsSync(path.join(cur, 'extensions'))) {
                    root = cur;
                    break;
                }
                cur = path.dirname(cur);
            }
        }
        if (!root) {
            root = process.cwd();
        }

        const nexusDir = path.join(root, 'extensions', 'pts-nexus');
        const nexusPkg = path.join(nexusDir, 'package.json');
        if (!fs.existsSync(nexusPkg)) {
            return false;
        }

        const packagesConfig = path.join(root, 'profiles', 'v2', 'editor', 'packages.json');
        if (fs.existsSync(packagesConfig)) {
            const raw = fs.readFileSync(packagesConfig, 'utf8');
            const parsed = JSON.parse(raw);
            const disabled = parsed?.['disable-packages'];
            if (disabled && typeof disabled === 'object') {
                for (const [key, val] of Object.entries(disabled)) {
                    if (key.toLowerCase().includes('pts-nexus')) {
                        return false;
                    }
                    if (val && typeof val === 'object' && (val as any).name === 'pts-nexus') {
                        return false;
                    }
                }
            }
        }

        return true;
    } catch {
        return false;
    }
}
