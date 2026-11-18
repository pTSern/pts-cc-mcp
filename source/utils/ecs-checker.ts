import * as fs from 'fs';
import * as path from 'path';

declare const Editor: any;

export function resolveProjectRoot(projectPath?: string): string {
    if (projectPath) return projectPath;
    if (typeof Editor !== 'undefined' && (Editor as any)?.Project?.path) {
        return (Editor as any).Project.path;
    }
    let cur = __dirname;
    for (let i = 0; i < 6; i++) {
        if (fs.existsSync(path.join(cur, 'assets')) && fs.existsSync(path.join(cur, 'extensions'))) {
            return cur;
        }
        cur = path.dirname(cur);
    }
    return process.cwd();
}

/**
 * Checks whether the pts-ecs extension exists in the current project and is not disabled.
 */
export function isEcsAvailable(projectPath?: string): boolean {
    try {
        const root = resolveProjectRoot(projectPath);
        const ecsPkg = path.join(root, 'extensions', 'pts-ecs', 'package.json');
        if (!fs.existsSync(ecsPkg)) {
            return false;
        }

        const packagesConfig = path.join(root, 'profiles', 'v2', 'editor', 'packages.json');
        if (fs.existsSync(packagesConfig)) {
            const raw = fs.readFileSync(packagesConfig, 'utf8');
            const parsed = JSON.parse(raw);
            const disabled = parsed?.['disable-packages'];
            if (disabled && typeof disabled === 'object') {
                for (const [key, val] of Object.entries(disabled)) {
                    if (key.toLowerCase().includes('pts-ecs')) {
                        return false;
                    }
                    if (val && typeof val === 'object' && (val as any).name === 'pts-ecs') {
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
