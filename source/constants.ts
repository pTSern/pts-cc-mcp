import * as path from 'path';
import * as fs from 'fs';

function resolvePackageName(): string {
    const candidatePaths = [
        path.join(__dirname, '../package.json'),
        path.join(__dirname, '../../package.json'),
        path.join(__dirname, '../../../package.json'),
    ];
    for (const p of candidatePaths) {
        try {
            if (fs.existsSync(p)) {
                const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
                if (pkg.name) return pkg.name;
            }
        } catch {}
    }
    return 'pts-cc-mcp';
}

export const EXTENSION_NAME = resolvePackageName();
export const SCENE_SCRIPT_TARGET = 'pts-core';
