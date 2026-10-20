import * as fs from 'fs';
import * as path from 'path';

declare const Editor: any;

const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decompress Cocos Creator 22/23 character compressed UUID into standard 36 character UUID.
 */
export function decompressUuid(str: string): string {
    if (!str || typeof str !== 'string') return '';
    if (str.length === 36) return str;
    if (str.length !== 22 && str.length !== 23) return str;

    const prefix = str.slice(0, 5);
    const rest = str.slice(5);
    let hex = prefix;

    for (let i = 0; i < rest.length; i += 2) {
        const lhs = BASE64_KEYS.indexOf(rest[i]);
        const rhs = BASE64_KEYS.indexOf(rest[i + 1]);
        if (lhs === -1 || rhs === -1) return str;
        const val = (lhs << 6) | rhs;
        hex += ((val >> 8) & 0xf).toString(16);
        hex += ((val >> 4) & 0xf).toString(16);
        hex += (val & 0xf).toString(16);
    }

    if (hex.length >= 32) {
        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20, 32)
        ].join('-');
    }
    return str;
}

/**
 * Compress 36 character standard UUID into Cocos Creator 22 character compressed UUID.
 */
export function compressUuid(uuid: string): string {
    if (!uuid || typeof uuid !== 'string') return '';
    const cleanUuid = uuid.replace(/-/g, '');
    if (cleanUuid.length !== 32) return uuid;

    const prefix = cleanUuid.slice(0, 5);
    const rest = cleanUuid.slice(5); // 27 hex characters -> 9 triplets
    let compressed = prefix;

    for (let i = 0; i < rest.length; i += 3) {
        const hexTriplet = rest.slice(i, i + 3);
        const val = parseInt(hexTriplet, 16);
        const lhs = (val >> 6) & 0x3f;
        const rhs = val & 0x3f;
        compressed += BASE64_KEYS[lhs] + BASE64_KEYS[rhs];
    }

    return compressed;
}

export interface ScriptClassInfo {
    uuid: string;
    cid: string;
    className: string;
    filePath: string;
}

/**
 * Registry caching script metadata for instant CID/UUID to ClassName resolution.
 */
export class ScriptMetaRegistry {
    private static instance: ScriptMetaRegistry | null = null;
    private uuidToInfo: Map<string, ScriptClassInfo> = new Map();
    private cidToInfo: Map<string, ScriptClassInfo> = new Map();
    private nameToInfo: Map<string, ScriptClassInfo> = new Map();
    private lastScanTime: number = 0;
    private readonly CACHE_TTL_MS = 60 * 1000;

    public static getInstance(): ScriptMetaRegistry {
        if (!ScriptMetaRegistry.instance) {
            ScriptMetaRegistry.instance = new ScriptMetaRegistry();
        }
        return ScriptMetaRegistry.instance;
    }

    public getProjectRoot(): string {
        if (typeof Editor !== 'undefined' && Editor?.Project?.path) {
            return Editor.Project.path;
        }
        // Fallback relative to current extension directory
        return path.resolve(__dirname, '../../../..');
    }

    public refresh(force: boolean = false): void {
        const now = Date.now();
        if (!force && this.uuidToInfo.size > 0 && (now - this.lastScanTime) < this.CACHE_TTL_MS) {
            return;
        }

        const projectRoot = this.getProjectRoot();
        const scanDirs = [
            path.join(projectRoot, 'assets'),
            path.join(projectRoot, 'extensions')
        ];

        this.uuidToInfo.clear();
        this.cidToInfo.clear();
        this.nameToInfo.clear();

        for (const dir of scanDirs) {
            if (fs.existsSync(dir)) {
                this.scanMetaFiles(dir);
            }
        }

        this.lastScanTime = Date.now();
    }

    private scanMetaFiles(dir: string): void {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'temp' && entry.name !== 'bin') {
                        this.scanMetaFiles(fullPath);
                    }
                } else if (entry.isFile() && entry.name.endsWith('.meta')) {
                    if (entry.name.endsWith('.ts.meta') || entry.name.endsWith('.js.meta')) {
                        this.indexScriptMeta(fullPath);
                    }
                }
            }
        } catch {
            // Ignore access errors on individual directories
        }
    }

    private indexScriptMeta(metaPath: string): void {
        try {
            const content = fs.readFileSync(metaPath, 'utf8');
            const data = JSON.parse(content);
            const uuid = data?.uuid;
            if (!uuid || typeof uuid !== 'string') return;

            const scriptPath = metaPath.slice(0, -5);
            const rawBase = path.basename(scriptPath, path.extname(scriptPath));
            // Derive clean class identifier (e.g. "Objective.Element.Bomb" or "Box2D.Shape.Circle")
            const className = rawBase;
            const cid = compressUuid(uuid);

            const info: ScriptClassInfo = {
                uuid,
                cid,
                className,
                filePath: scriptPath
            };

            this.uuidToInfo.set(uuid, info);
            this.cidToInfo.set(cid, info);
            this.nameToInfo.set(className.toLowerCase(), info);
            this.nameToInfo.set(className.replace(/\./g, '_').toLowerCase(), info);
        } catch {
            // Ignore malformed meta JSON
        }
    }

    public resolveType(rawType: string): { type: string; className?: string; isEngineType: boolean } {
        if (!rawType) return { type: 'unknown', isEngineType: false };
        if (rawType.startsWith('cc.')) {
            return { type: rawType, className: rawType, isEngineType: true };
        }

        this.refresh();

        // Check if rawType is CID
        const byCid = this.cidToInfo.get(rawType);
        if (byCid) {
            return { type: rawType, className: byCid.className, isEngineType: false };
        }

        // Try decompressing to UUID
        const decompressed = decompressUuid(rawType);
        const byUuid = this.uuidToInfo.get(decompressed);
        if (byUuid) {
            return { type: rawType, className: byUuid.className, isEngineType: false };
        }

        // Check if rawType matches known class name
        const byName = this.nameToInfo.get(rawType.toLowerCase());
        if (byName) {
            return { type: byName.cid, className: byName.className, isEngineType: false };
        }

        return { type: rawType, isEngineType: false };
    }

    public resolveClassName(rawType: string): string {
        const resolved = this.resolveType(rawType);
        return resolved.className || resolved.type || rawType;
    }

    public getInfoByUuid(uuid: string): ScriptClassInfo | undefined {
        this.refresh();
        return this.uuidToInfo.get(uuid);
    }

    public getInfoByCid(cid: string): ScriptClassInfo | undefined {
        this.refresh();
        return this.cidToInfo.get(cid);
    }
}
