import * as fs from 'fs';
import * as path from 'path';
import { resolveProjectRoot } from './ecs-checker';

/**
 * Checks whether the pts-asset extension exists in the current project and is not disabled.
 */
export function isPtsAssetAvailable(projectPath?: string): boolean {
    try {
        const root = resolveProjectRoot(projectPath);
        const pkgPath = path.join(root, 'extensions', 'pts-asset', 'package.json');
        if (!fs.existsSync(pkgPath)) {
            return false;
        }

        const packagesConfig = path.join(root, 'profiles', 'v2', 'editor', 'packages.json');
        if (fs.existsSync(packagesConfig)) {
            const raw = fs.readFileSync(packagesConfig, 'utf8');
            const parsed = JSON.parse(raw);
            const disabled = parsed?.['disable-packages'];
            if (disabled && typeof disabled === 'object') {
                for (const [key, val] of Object.entries(disabled)) {
                    if (key.toLowerCase().includes('pts-asset')) {
                        return false;
                    }
                    if (val && typeof val === 'object' && (val as any).name === 'pts-asset') {
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

export { resolveProjectRoot };
