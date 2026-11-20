import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { isPtsAssetAvailable, resolveProjectRoot } from '../utils/pts-asset-checker';

declare const Editor: any;

interface ResolvedPtsTarget {
    file: string;
    url: string;
    uuid: string;
}

const IGNORED_ROOT_KEYS = new Set([
    '_name', '_objFlags', '__editorExtras__', '_native', '_nativeAsset', 'name', 'isValid',
    '_callbackTable', '_nativeUrl', '_file', '_ref', 'loaded', 'rawUrl', '_uuid', 'uuid',
    '_isLoaded', '_ready', '_resolver', '_driver', '_onLoad', '_onReleased', '_onAwake', 'ready',
    'enabled', '_enabled', 'node', 'script', '__scriptAsset'
]);

export class PtsAssetTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'pts_asset_manage',
                description: 'HEADLESS pTS ASSET MANAGER (requires pts-asset extension): List pTSAsset classes, list/inspect/create/register/update/verify/delete .pts assets directly on disk, sync .meta & _lazy.prefab, and trigger pts-asset extension API to refresh the pTS Inspector if currently watching.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: [
                                'list_classes',
                                'list',
                                'inspect',
                                'create',
                                'register',
                                'update',
                                'verify',
                                'delete',
                                'refresh_inspector'
                            ],
                            description: 'pTS asset headless action opcode'
                        },
                        targetFile: {
                            type: 'string',
                            description: 'Target .pts file path: "db://assets/...", project-relative "assets/...", absolute path, or asset UUID'
                        },
                        url: {
                            type: 'string',
                            description: 'Alias for targetFile (e.g. "db://assets/configs/Test.pts")'
                        },
                        uuid: {
                            type: 'string',
                            description: 'Asset UUID of an existing .pts asset'
                        },
                        folder: {
                            type: 'string',
                            description: 'Folder path for list (filter) or create (parent folder, e.g. "db://assets/configs")'
                        },
                        name: {
                            type: 'string',
                            description: 'File name for create when using folder (e.g. "EnemyConfig" or "EnemyConfig.pts")'
                        },
                        className: {
                            type: 'string',
                            description: 'Target pTSAsset @ccclass name (e.g. "Test_Config") for create, register, update, or list filter'
                        },
                        type: {
                            type: 'string',
                            description: 'Alias for className'
                        },
                        values: {
                            type: 'object',
                            description: 'Property values map for __value__ (for create / update)'
                        },
                        set: {
                            type: 'object',
                            description: 'Dot-path property updates for update (e.g. { "hp": 100, "maps.0.selecter": "XVel" }). Automatically steps through { __type__, __value__ } wrappers.'
                        },
                        remove: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Dot-paths of properties to delete from __value__ (for update)'
                        },
                        merge: {
                            type: 'boolean',
                            default: true,
                            description: 'For update: deep-merge values into existing __value__ (true) or replace __value__ completely (false)'
                        },
                        useClassDefaults: {
                            type: 'boolean',
                            default: true,
                            description: 'For create: fetch live class default values from pts-core:dump when available'
                        },
                        verify: {
                            type: 'boolean',
                            default: true,
                            description: 'For create/update/register: run live schema verify to prune removed properties and strip getters/setters when scene dump is available'
                        },
                        includeSchema: {
                            type: 'boolean',
                            default: false,
                            description: 'For inspect: include live class dump metadata from pts-core:dump if available'
                        },
                        isLazy: {
                            type: 'boolean',
                            description: 'Optional meta.userData.isLazy flag for create / register / update'
                        },
                        isForceLazy: {
                            type: 'boolean',
                            description: 'Optional meta.userData.isForceLazy flag for create / register / update'
                        },
                        overwrite: {
                            type: 'boolean',
                            default: false,
                            description: 'For create: overwrite if target .pts file already exists'
                        },
                        dryRun: {
                            type: 'boolean',
                            default: false,
                            description: 'Simulate create / update / verify without writing files to disk'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    private loadPtsFixer(): any | null {
        try {
            const root = resolveProjectRoot();
            const fixerPath = path.join(root, 'extensions', 'pts-asset', 'dist', 'pts-fixer.js');
            if (fs.existsSync(fixerPath)) {
                return require(fixerPath);
            }
        } catch {}
        return null;
    }

    private extractDependencies(val: any, out: Set<string> = new Set()): string[] {
        const fixer = this.loadPtsFixer();
        if (fixer && typeof fixer.extractAssetDependencies === 'function') {
            try {
                return fixer.extractAssetDependencies(val);
            } catch {}
        }
        if (!val || typeof val !== 'object') return Array.from(out);
        if (Array.isArray(val)) {
            for (const item of val) this.extractDependencies(item, out);
            return Array.from(out);
        }
        if (val.__value__ && typeof val.__value__ === 'object' && typeof val.__value__.uuid === 'string' && val.__value__.uuid) {
            out.add(val.__value__.uuid);
        } else if (typeof val.uuid === 'string' && val.uuid) {
            out.add(val.uuid);
        }
        for (const k of Object.keys(val)) {
            if (k === '__type__') continue;
            this.extractDependencies(val[k], out);
        }
        return Array.from(out);
    }

    private toDbUrl(absFile: string, root: string): string {
        const rel = path.relative(root, absFile).replace(/\\/g, '/');
        if (rel.startsWith('assets/')) return `db://${rel}`;
        if (rel === 'assets') return 'db://assets';
        return `db://${rel}`;
    }

    private normalizePtsFilePath(input: string, root: string): string {
        let trimmed = String(input || '').trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('db://assets/')) {
            return path.join(root, 'assets', trimmed.slice('db://assets/'.length));
        }
        if (trimmed === 'db://assets') {
            return path.join(root, 'assets');
        }
        if (path.isAbsolute(trimmed)) {
            return path.normalize(trimmed);
        }
        const normRel = trimmed.replace(/\\/g, '/').replace(/^\/+/, '');
        if (normRel.startsWith('assets/')) {
            return path.join(root, normRel);
        }
        return path.join(root, 'assets', normRel);
    }

    private findPtsFilesOnDisk(dir: string, out: string[] = []): string[] {
        if (!fs.existsSync(dir)) return out;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'temp' || entry.name === 'library' || entry.name === 'build') {
                    continue;
                }
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    this.findPtsFilesOnDisk(full, out);
                } else if (entry.isFile() && entry.name.endsWith('.pts')) {
                    out.push(full);
                }
            }
        } catch {}
        return out;
    }

    private readMetaFromDisk(ptsFile: string): any | null {
        const metaPath = `${ptsFile}.meta`;
        if (!fs.existsSync(metaPath)) return null;
        try {
            return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch {
            return null;
        }
    }

    private async resolveTarget(args: any): Promise<ResolvedPtsTarget | null> {
        const root = resolveProjectRoot();
        const rawTarget = args?.targetFile || args?.url || args?.uuid || '';
        const rawFolder = args?.folder || '';
        const rawName = args?.name || '';

        if (!rawTarget && rawFolder && rawName) {
            const dirPath = this.normalizePtsFilePath(rawFolder, root);
            const fileName = rawName.endsWith('.pts') ? rawName : `${rawName}.pts`;
            const file = path.join(dirPath, fileName);
            const meta = this.readMetaFromDisk(file);
            return {
                file,
                url: this.toDbUrl(file, root),
                uuid: meta?.uuid || ''
            };
        }

        if (!rawTarget) return null;

        // Check if rawTarget is a UUID (no slashes, not ending with .pts)
        const isLikelyUuid = typeof rawTarget === 'string' && !rawTarget.includes('/') && !rawTarget.includes('\\') && !rawTarget.endsWith('.pts');
        if (isLikelyUuid) {
            if (typeof Editor !== 'undefined' && Editor?.Message?.request) {
                try {
                    const info = await Editor.Message.request('asset-db', 'query-asset-info', rawTarget);
                    if (info && info.file) {
                        return {
                            file: info.file,
                            url: info.url || this.toDbUrl(info.file, root),
                            uuid: info.uuid || rawTarget
                        };
                    }
                } catch {}
            }
            // Headless fallback: scan assets/ for matching .pts.meta UUID
            const allPts = this.findPtsFilesOnDisk(path.join(root, 'assets'));
            for (const f of allPts) {
                const meta = this.readMetaFromDisk(f);
                if (meta?.uuid === rawTarget) {
                    return { file: f, url: this.toDbUrl(f, root), uuid: rawTarget };
                }
            }
            return null;
        }

        let file = this.normalizePtsFilePath(rawTarget, root);
        if (!file.endsWith('.pts')) {
            file = `${file}.pts`;
        }
        const url = this.toDbUrl(file, root);
        let uuid = '';
        const meta = this.readMetaFromDisk(file);
        if (meta?.uuid) uuid = meta.uuid;
        if (!uuid && typeof Editor !== 'undefined' && Editor?.Message?.request) {
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', url);
                if (info?.uuid) uuid = info.uuid;
            } catch {}
        }
        return { file, url, uuid };
    }

    private async fetchClassDump(className: string, currentValues?: Record<string, any>): Promise<any | null> {
        if (!className || typeof Editor === 'undefined' || !Editor?.Message?.request) return null;
        try {
            const args = currentValues !== undefined ? [className, currentValues] : [className];
            const dump = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'pts-core',
                method: 'dump',
                args
            });
            return dump && dump.value ? dump : null;
        } catch {
            return null;
        }
    }

    private deepMergeValue(base: any, patch: any): any {
        if (patch === null || patch === undefined || typeof patch !== 'object' || Array.isArray(patch)) {
            return patch;
        }
        if (!base || typeof base !== 'object' || Array.isArray(base)) {
            return JSON.parse(JSON.stringify(patch));
        }

        // Handle { __type__, __value__ } wrappers
        if ('__type__' in base && '__value__' in base && '__type__' in patch && '__value__' in patch) {
            if (base.__type__ !== patch.__type__) {
                return JSON.parse(JSON.stringify(patch));
            }
            return {
                __type__: patch.__type__,
                __value__: this.deepMergeValue(base.__value__, patch.__value__)
            };
        }
        if ('__type__' in base && '__value__' in base && !('__type__' in patch)) {
            return {
                __type__: base.__type__,
                __value__: this.deepMergeValue(base.__value__, patch)
            };
        }

        const out: Record<string, any> = { ...base };
        for (const [k, v] of Object.entries(patch)) {
            out[k] = k in out ? this.deepMergeValue(out[k], v) : JSON.parse(JSON.stringify(v));
        }
        return out;
    }

    private setByDotPath(rootObj: Record<string, any>, dotPath: string, value: any): void {
        const parts = dotPath.split('.').filter(Boolean);
        if (parts.length === 0) return;

        let cur: any = rootObj;
        for (let i = 0; i < parts.length - 1; i++) {
            const seg = parts[i];
            if (cur && typeof cur === 'object' && !Array.isArray(cur) && '__type__' in cur && '__value__' in cur && seg !== '__type__' && seg !== '__value__') {
                cur = cur.__value__;
            }
            const nextSeg = parts[i + 1];
            const isNextIndex = /^\d+$/.test(nextSeg);
            if (Array.isArray(cur)) {
                const idx = Number(seg);
                if (cur[idx] === undefined || cur[idx] === null || typeof cur[idx] !== 'object') {
                    cur[idx] = isNextIndex ? [] : {};
                }
                cur = cur[idx];
            } else {
                if (cur[seg] === undefined || cur[seg] === null || typeof cur[seg] !== 'object') {
                    cur[seg] = isNextIndex ? [] : {};
                }
                cur = cur[seg];
            }
        }

        const lastSeg = parts[parts.length - 1];
        if (cur && typeof cur === 'object' && !Array.isArray(cur) && '__type__' in cur && '__value__' in cur && lastSeg !== '__type__' && lastSeg !== '__value__') {
            cur = cur.__value__;
        }
        if (Array.isArray(cur) && /^\d+$/.test(lastSeg)) {
            cur[Number(lastSeg)] = value;
        } else if (cur && typeof cur === 'object') {
            cur[lastSeg] = value;
        }
    }

    private removeByDotPath(rootObj: Record<string, any>, dotPath: string): boolean {
        const parts = dotPath.split('.').filter(Boolean);
        if (parts.length === 0) return false;

        let cur: any = rootObj;
        for (let i = 0; i < parts.length - 1; i++) {
            const seg = parts[i];
            if (cur && typeof cur === 'object' && !Array.isArray(cur) && '__type__' in cur && '__value__' in cur && seg !== '__type__' && seg !== '__value__') {
                cur = cur.__value__;
            }
            if (!cur || typeof cur !== 'object') return false;
            cur = Array.isArray(cur) && /^\d+$/.test(seg) ? cur[Number(seg)] : cur[seg];
        }

        if (!cur || typeof cur !== 'object') return false;
        const lastSeg = parts[parts.length - 1];
        if (!Array.isArray(cur) && '__type__' in cur && '__value__' in cur && lastSeg !== '__type__' && lastSeg !== '__value__') {
            cur = cur.__value__;
        }
        if (!cur || typeof cur !== 'object') return false;
        if (Array.isArray(cur) && /^\d+$/.test(lastSeg)) {
            const idx = Number(lastSeg);
            if (idx >= 0 && idx < cur.length) {
                cur.splice(idx, 1);
                return true;
            }
            return false;
        }
        if (lastSeg in cur) {
            delete cur[lastSeg];
            return true;
        }
        return false;
    }

    private syncMetaOnDiskFallback(
        ptsFile: string,
        className: string,
        depends: string[],
        lazyOpts?: { isLazy?: boolean; isForceLazy?: boolean }
    ): boolean {
        const metaPath = `${ptsFile}.meta`;
        if (!fs.existsSync(metaPath)) return false;
        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            meta.userData = meta.userData || {};
            if (className) meta.userData.__type__ = className;
            meta.userData.__depends__ = depends;
            delete meta.userData.depends;
            if (typeof lazyOpts?.isLazy === 'boolean') {
                meta.userData.isLazy = lazyOpts.isLazy;
                if (!lazyOpts.isLazy) {
                    meta.userData.isForceLazy = false;
                    meta.userData.forceLazy = false;
                }
            }
            if (typeof lazyOpts?.isForceLazy === 'boolean') {
                const isForce = lazyOpts.isForceLazy && (meta.userData.isLazy !== false);
                if (isForce) meta.userData.isLazy = true;
                meta.userData.isForceLazy = isForce;
                meta.userData.forceLazy = isForce;
            }
            if (Array.isArray(meta.files)) {
                if (!meta.files.includes('.json')) meta.files.unshift('.json');
                if (!meta.files.includes('.pts')) meta.files.push('.pts');
            }
            fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Notify pts-asset extension API to register/re-index the .pts asset AND refresh the pTS Inspector (if currently watching).
     */
    private async notifyPtsAssetExtension(
        mode: 'register' | 'refresh',
        payload: { uuid?: string; url?: string; file?: string; type?: string; isLazy?: boolean; isForceLazy?: boolean }
    ): Promise<{ notified: boolean; via: string; result?: any }> {
        if (typeof Editor === 'undefined' || !Editor?.Message) {
            return { notified: false, via: 'headless-fs' };
        }

        // First make sure asset-db has imported/refreshed the file on disk
        if (payload.url && typeof Editor.Message.request === 'function') {
            try {
                await Editor.Message.request('asset-db', 'refresh-asset', payload.url);
            } catch {}
        }

        const msgName = mode === 'register' ? 'register-pts-asset' : 'refresh-pts-inspector';
        if (typeof Editor.Message.request === 'function') {
            try {
                const res = await Editor.Message.request('pts-asset', msgName, payload);
                return { notified: true, via: `pts-asset:${msgName}`, result: res };
            } catch {}
        }
        if (typeof Editor.Message.send === 'function') {
            try {
                Editor.Message.send('pts-asset', msgName, payload);
                return { notified: true, via: `pts-asset:${msgName}:send` };
            } catch {}
        }
        return { notified: false, via: 'unavailable' };
    }

    private listPtsClasses(): any[] {
        const root = resolveProjectRoot();
        try {
            const assetMenuPath = path.join(root, 'extensions', 'pts-asset', 'dist', 'asset-menu.js');
            const inheritancePath = path.join(root, 'extensions', 'pts-asset', 'dist', 'inheritance.js');
            if (fs.existsSync(assetMenuPath)) {
                const assetMenu = require(assetMenuPath);
                const inheritance = fs.existsSync(inheritancePath) ? require(inheritancePath) : null;
                if (typeof assetMenu.scanProjectPtsClasses === 'function') {
                    const names: string[] = assetMenu.scanProjectPtsClasses() || [];
                    return names.map(name => ({
                        className: name,
                        isAbstract: typeof assetMenu.isAbstractClass === 'function' ? assetMenu.isAbstractClass(name) : false,
                        menuPath: typeof assetMenu.getMenuPath === 'function' ? (assetMenu.getMenuPath(name) || null) : null,
                        scriptPath: inheritance && typeof inheritance.getScriptPathForClass === 'function'
                            ? (inheritance.getScriptPathForClass(name) || null)
                            : null,
                        extends: inheritance && typeof inheritance.getExtendsChain === 'function'
                            ? inheritance.getExtendsChain(name)
                            : []
                    }));
                }
            }
        } catch {}

        // Pure regex fallback scanning assets/
        const results: any[] = [];
        const walkTs = (dir: string) => {
            if (!fs.existsSync(dir)) return;
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'temp' || entry.name === 'library') continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walkTs(full);
                else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
                    const src = fs.readFileSync(full, 'utf8');
                    const regex = /@ccclass\s*\(\s*['"]([^'"]+)['"]\s*\)[\s\S]*?(abstract\s+)?class\s+(\w+)\s+extends\s+([A-Za-z0-9_.]+)/g;
                    for (const m of src.matchAll(regex)) {
                        if (m[4].includes('pTSAsset') || m[4].includes('Config') || m[4].includes('Asset')) {
                            results.push({
                                className: m[1] || m[3],
                                isAbstract: Boolean(m[2]),
                                scriptPath: full
                            });
                        }
                    }
                }
            }
        };
        walkTs(path.join(root, 'assets'));
        return results;
    }

    async execute(_toolName: string, args: any): Promise<ToolResponse> {
        if (!isPtsAssetAvailable()) {
            return {
                success: false,
                error: 'pts-asset extension is not installed or is disabled in the current project.'
            };
        }

        const action = args?.action;
        const root = resolveProjectRoot();

        try {
            switch (action) {
                case 'list_classes': {
                    const classes = this.listPtsClasses();
                    return {
                        success: true,
                        data: { count: classes.length, classes }
                    };
                }

                case 'list': {
                    const searchRoot = args?.folder
                        ? this.normalizePtsFilePath(args.folder, root)
                        : path.join(root, 'assets');
                    const filterType = args?.className || args?.type || '';
                    const files = this.findPtsFilesOnDisk(searchRoot);
                    const items: any[] = [];
                    for (const file of files) {
                        let parsedType = '';
                        try {
                            const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
                            parsedType = parsed?.__type__ || '';
                        } catch {}
                        const meta = this.readMetaFromDisk(file);
                        const finalType = parsedType || meta?.userData?.__type__ || '';
                        if (filterType && finalType !== filterType) continue;
                        items.push({
                            url: this.toDbUrl(file, root),
                            file,
                            uuid: meta?.uuid || '',
                            type: finalType,
                            isLazy: Boolean(meta?.userData?.isLazy),
                            isForceLazy: Boolean(meta?.userData?.isForceLazy || meta?.userData?.forceLazy)
                        });
                    }
                    return {
                        success: true,
                        data: { count: items.length, assets: items }
                    };
                }

                case 'inspect': {
                    const target = await this.resolveTarget(args);
                    if (!target || !fs.existsSync(target.file)) {
                        return { success: false, error: `Target .pts file not found: ${args?.targetFile || args?.url || args?.uuid || ''}` };
                    }
                    const raw = fs.readFileSync(target.file, 'utf8');
                    const parsed = JSON.parse(raw);
                    const meta = this.readMetaFromDisk(target.file);
                    const data: any = {
                        url: target.url,
                        file: target.file,
                        uuid: target.uuid || meta?.uuid || '',
                        __type__: parsed?.__type__ || '',
                        __value__: parsed?.__value__ || {},
                        meta: meta ? {
                            uuid: meta.uuid,
                            isLazy: Boolean(meta.userData?.isLazy),
                            isForceLazy: Boolean(meta.userData?.isForceLazy || meta.userData?.forceLazy),
                            __type__: meta.userData?.__type__ || '',
                            __depends__: meta.userData?.__depends__ || []
                        } : null
                    };
                    if (args?.includeSchema && parsed?.__type__) {
                        const dump = await this.fetchClassDump(parsed.__type__, parsed.__value__);
                        if (dump) {
                            data.schema = {
                                getters: dump.__getters__ || {},
                                editorProps: dump.__editor_props__ || {},
                                properties: Object.keys(dump.value || {})
                            };
                        }
                    }
                    return { success: true, data };
                }

                case 'create': {
                    const className = args?.className || args?.type;
                    if (!className || typeof className !== 'string') {
                        return { success: false, error: 'Missing required parameter "className" (or "type") for create action.' };
                    }
                    const target = await this.resolveTarget(args);
                    if (!target) {
                        return { success: false, error: 'Missing target path: provide "targetFile"/"url" or "folder" + "name".' };
                    }
                    const overwrite = Boolean(args?.overwrite);
                    if (fs.existsSync(target.file) && !overwrite) {
                        return { success: false, error: `Target .pts file already exists: ${target.url}. Pass overwrite=true or use action="update".` };
                    }

                    const useClassDefaults = args?.useClassDefaults !== false;
                    const shouldVerify = args?.verify !== false;
                    const fixer = this.loadPtsFixer();

                    let initialValues: Record<string, any> = {};
                    if (useClassDefaults) {
                        const dump = await this.fetchClassDump(className);
                        if (dump && fixer && typeof fixer.collectValuesFromDump === 'function') {
                            initialValues = fixer.collectValuesFromDump(dump.value, dump.__getters__, dump.__editor_props__);
                        }
                    }

                    let finalValues = (args?.values && typeof args.values === 'object')
                        ? this.deepMergeValue(initialValues, args.values)
                        : initialValues;

                    // Clean ignored root keys
                    for (const k of Object.keys(finalValues)) {
                        if (IGNORED_ROOT_KEYS.has(k) || k.startsWith('__')) {
                            delete finalValues[k];
                        }
                    }

                    // Run live schema verification (prunes removed/unknown keys & strips getters) when scene dump is available
                    let removedKeys: string[] = [];
                    if (shouldVerify && fixer && typeof fixer.verifyAndCleanDataFromDump === 'function') {
                        const hydratedDump = await this.fetchClassDump(className, finalValues);
                        if (hydratedDump) {
                            if (typeof fixer.resolveAllAssetSubtypes === 'function') {
                                await fixer.resolveAllAssetSubtypes(hydratedDump.value).catch(() => {});
                            }
                            const verifyRes = fixer.verifyAndCleanDataFromDump(finalValues, hydratedDump);
                            finalValues = verifyRes.cleanValues;
                            removedKeys = verifyRes.removedKeys || [];
                        }
                    }

                    const ptsData = {
                        __type__: className,
                        __value__: finalValues
                    };
                    const content = JSON.stringify(ptsData, null, 4);
                    const depends = this.extractDependencies(ptsData);

                    if (args?.dryRun) {
                        return {
                            success: true,
                            data: {
                                dryRun: true,
                                url: target.url,
                                file: target.file,
                                __type__: className,
                                __value__: finalValues,
                                depends,
                                removedKeys
                            }
                        };
                    }

                    fs.mkdirSync(path.dirname(target.file), { recursive: true });
                    fs.writeFileSync(target.file, content, 'utf8');

                    // Update existing meta if present (pure headless fallback), then call pts-asset extension API
                    this.syncMetaOnDiskFallback(target.file, className, depends, {
                        isLazy: args?.isLazy,
                        isForceLazy: args?.isForceLazy
                    });

                    const extSync = await this.notifyPtsAssetExtension('register', {
                        uuid: target.uuid || undefined,
                        url: target.url,
                        file: target.file,
                        type: className,
                        isLazy: args?.isLazy,
                        isForceLazy: args?.isForceLazy
                    });

                    const refreshedMeta = this.readMetaFromDisk(target.file);
                    return {
                        success: true,
                        data: {
                            created: true,
                            url: target.url,
                            file: target.file,
                            uuid: extSync.result?.uuid || refreshedMeta?.uuid || target.uuid || '',
                            __type__: className,
                            __value__: finalValues,
                            depends,
                            removedKeys,
                            inspectorSync: extSync
                        }
                    };
                }

                case 'register': {
                    const target = await this.resolveTarget(args);
                    if (!target || !fs.existsSync(target.file)) {
                        return { success: false, error: `Target .pts file not found for register: ${args?.targetFile || args?.url || args?.uuid || ''}` };
                    }

                    let ptsData: any = {};
                    try {
                        ptsData = JSON.parse(fs.readFileSync(target.file, 'utf8'));
                    } catch {
                        ptsData = {};
                    }

                    const className = args?.className || args?.type || ptsData?.__type__;
                    if (!className) {
                        return { success: false, error: 'Cannot register .pts asset without __type__. Provide "className" (or "type").' };
                    }

                    let valueObj = (ptsData && typeof ptsData.__value__ === 'object' && ptsData.__value__ !== null) ? ptsData.__value__ : {};
                    const fixer = this.loadPtsFixer();
                    let removedKeys: string[] = [];

                    if (args?.verify === true && fixer && typeof fixer.verifyAndCleanDataFromDump === 'function') {
                        const dump = await this.fetchClassDump(className, valueObj);
                        if (dump) {
                            if (typeof fixer.resolveAllAssetSubtypes === 'function') {
                                await fixer.resolveAllAssetSubtypes(dump.value).catch(() => {});
                            }
                            const verifyRes = fixer.verifyAndCleanDataFromDump(valueObj, dump);
                            valueObj = verifyRes.cleanValues;
                            removedKeys = verifyRes.removedKeys || [];
                        }
                    }

                    const normalizedPts = { __type__: className, __value__: valueObj };
                    const newContent = JSON.stringify(normalizedPts, null, 4);
                    const oldRaw = fs.readFileSync(target.file, 'utf8');
                    if (newContent.trim() !== oldRaw.trim()) {
                        fs.writeFileSync(target.file, newContent, 'utf8');
                    }

                    const depends = this.extractDependencies(normalizedPts);
                    this.syncMetaOnDiskFallback(target.file, className, depends, {
                        isLazy: args?.isLazy,
                        isForceLazy: args?.isForceLazy
                    });

                    const extSync = await this.notifyPtsAssetExtension('register', {
                        uuid: target.uuid || undefined,
                        url: target.url,
                        file: target.file,
                        type: className,
                        isLazy: args?.isLazy,
                        isForceLazy: args?.isForceLazy
                    });

                    const refreshedMeta = this.readMetaFromDisk(target.file);
                    return {
                        success: true,
                        data: {
                            registered: true,
                            url: target.url,
                            file: target.file,
                            uuid: extSync.result?.uuid || refreshedMeta?.uuid || target.uuid || '',
                            __type__: className,
                            depends,
                            removedKeys,
                            inspectorSync: extSync
                        }
                    };
                }

                case 'update': {
                    const target = await this.resolveTarget(args);
                    if (!target || !fs.existsSync(target.file)) {
                        return { success: false, error: `Target .pts file not found for update: ${args?.targetFile || args?.url || args?.uuid || ''}` };
                    }

                    const raw = fs.readFileSync(target.file, 'utf8');
                    const ptsData = JSON.parse(raw);
                    const className = args?.className || args?.type || ptsData?.__type__;
                    if (!className) {
                        return { success: false, error: 'Target .pts file has no __type__ and no className/type was provided.' };
                    }

                    const prevValues = (ptsData && typeof ptsData.__value__ === 'object' && ptsData.__value__ !== null)
                        ? JSON.parse(JSON.stringify(ptsData.__value__))
                        : {};

                    let nextValues: Record<string, any> = prevValues;
                    const merge = args?.merge !== false;

                    if (args?.values && typeof args.values === 'object') {
                        nextValues = merge
                            ? this.deepMergeValue(nextValues, args.values)
                            : JSON.parse(JSON.stringify(args.values));
                    }

                    if (args?.set && typeof args.set === 'object') {
                        for (const [dotPath, val] of Object.entries(args.set)) {
                            this.setByDotPath(nextValues, dotPath, val);
                        }
                    }

                    if (Array.isArray(args?.remove)) {
                        for (const dotPath of args.remove) {
                            if (typeof dotPath === 'string') {
                                this.removeByDotPath(nextValues, dotPath);
                            }
                        }
                    }

                    for (const k of Object.keys(nextValues)) {
                        if (IGNORED_ROOT_KEYS.has(k) || k.startsWith('__')) {
                            delete nextValues[k];
                        }
                    }

                    let removedKeys: string[] = [];
                    const shouldVerify = args?.verify !== false;
                    const fixer = this.loadPtsFixer();
                    if (shouldVerify && fixer && typeof fixer.verifyAndCleanDataFromDump === 'function') {
                        const dump = await this.fetchClassDump(className, nextValues);
                        if (dump) {
                            if (typeof fixer.resolveAllAssetSubtypes === 'function') {
                                await fixer.resolveAllAssetSubtypes(dump.value).catch(() => {});
                            }
                            const verifyRes = fixer.verifyAndCleanDataFromDump(nextValues, dump);
                            nextValues = verifyRes.cleanValues;
                            removedKeys = verifyRes.removedKeys || [];
                        }
                    }

                    const updatedPts = {
                        __type__: className,
                        __value__: nextValues
                    };
                    const newContent = JSON.stringify(updatedPts, null, 4);
                    const depends = this.extractDependencies(updatedPts);
                    const contentChanged = newContent.trim() !== raw.trim();

                    if (args?.dryRun) {
                        return {
                            success: true,
                            data: {
                                dryRun: true,
                                changed: contentChanged,
                                url: target.url,
                                file: target.file,
                                uuid: target.uuid,
                                __type__: className,
                                __value__: nextValues,
                                depends,
                                removedKeys
                            }
                        };
                    }

                    fs.writeFileSync(target.file, newContent, 'utf8');

                    const hasMetaUpdate = Boolean(
                        args?.className || args?.type ||
                        typeof args?.isLazy === 'boolean' ||
                        typeof args?.isForceLazy === 'boolean'
                    );
                    this.syncMetaOnDiskFallback(target.file, className, depends, {
                        isLazy: args?.isLazy,
                        isForceLazy: args?.isForceLazy
                    });

                    // Use register mode if type/lazy flags changed (persists meta via asset-db + refreshes inspector);
                    // otherwise refresh mode re-indexes, patches library & broadcasts refresh to any watching Inspector!
                    const extSync = await this.notifyPtsAssetExtension(hasMetaUpdate ? 'register' : 'refresh', {
                        uuid: target.uuid || undefined,
                        url: target.url,
                        file: target.file,
                        type: className,
                        isLazy: args?.isLazy,
                        isForceLazy: args?.isForceLazy
                    });

                    return {
                        success: true,
                        data: {
                            updated: true,
                            changed: contentChanged,
                            url: target.url,
                            file: target.file,
                            uuid: extSync.result?.uuid || target.uuid || '',
                            __type__: className,
                            __value__: nextValues,
                            depends,
                            removedKeys,
                            inspectorSync: extSync
                        }
                    };
                }

                case 'verify': {
                    const fixer = this.loadPtsFixer();
                    const target = await this.resolveTarget(args);

                    if (target) {
                        if (!fs.existsSync(target.file)) {
                            return { success: false, error: `Target .pts file not found: ${target.url}` };
                        }
                        const raw = fs.readFileSync(target.file, 'utf8');
                        const parsed = JSON.parse(raw);
                        const className = parsed?.__type__;
                        if (!className) {
                            return { success: false, error: `Missing __type__ in ${target.url}` };
                        }
                        const dump = await this.fetchClassDump(className, parsed.__value__ || {});
                        if (!dump || !fixer || typeof fixer.verifyAndCleanDataFromDump !== 'function') {
                            return { success: false, error: `Could not fetch live class dump for "${className}" (scene script unavailable or class not loaded).` };
                        }
                        if (typeof fixer.resolveAllAssetSubtypes === 'function') {
                            await fixer.resolveAllAssetSubtypes(dump.value).catch(() => {});
                        }
                        const verifyRes = fixer.verifyAndCleanDataFromDump(parsed.__value__ || {}, dump);
                        const newPts = { __type__: className, __value__: verifyRes.cleanValues };
                        const newContent = JSON.stringify(newPts, null, 4);
                        const changed = newContent.trim() !== raw.trim();

                        if (!args?.dryRun && changed) {
                            fs.writeFileSync(target.file, newContent, 'utf8');
                            const depends = this.extractDependencies(newPts);
                            this.syncMetaOnDiskFallback(target.file, className, depends);
                            await this.notifyPtsAssetExtension('refresh', {
                                uuid: target.uuid || undefined,
                                url: target.url,
                                file: target.file,
                                type: className
                            });
                        }

                        return {
                            success: true,
                            data: {
                                dryRun: Boolean(args?.dryRun),
                                url: target.url,
                                file: target.file,
                                uuid: target.uuid,
                                __type__: className,
                                changed,
                                removedKeys: verifyRes.removedKeys,
                                __value__: verifyRes.cleanValues
                            }
                        };
                    }

                    // Batch verify all .pts files via pts-asset extension IPC
                    if (typeof Editor !== 'undefined' && Editor?.Message?.request && !args?.dryRun) {
                        const report = await Editor.Message.request('pts-asset', 'fix-all-pts-assets');
                        await this.notifyPtsAssetExtension('refresh', {});
                        return { success: true, data: report };
                    }
                    return { success: false, error: 'Provide targetFile/url/uuid for dryRun or offline verify.' };
                }

                case 'delete': {
                    const target = await this.resolveTarget(args);
                    if (!target || !fs.existsSync(target.file)) {
                        return { success: false, error: `Target .pts file not found for delete: ${args?.targetFile || args?.url || args?.uuid || ''}` };
                    }
                    let deletedVia = 'fs';
                    if (typeof Editor !== 'undefined' && Editor?.Message?.request) {
                        try {
                            await Editor.Message.request('asset-db', 'delete-asset', target.url);
                            deletedVia = 'asset-db';
                        } catch {}
                    }
                    if (fs.existsSync(target.file)) {
                        fs.unlinkSync(target.file);
                        if (fs.existsSync(`${target.file}.meta`)) {
                            try { fs.unlinkSync(`${target.file}.meta`); } catch {}
                        }
                    }
                    if (typeof Editor !== 'undefined' && Editor?.Message?.send) {
                        try { Editor.Message.send('pts-asset', 'sync-lazy-prefab'); } catch {}
                    }
                    return {
                        success: true,
                        data: { deleted: true, via: deletedVia, url: target.url, file: target.file, uuid: target.uuid }
                    };
                }

                case 'refresh_inspector': {
                    const target = await this.resolveTarget(args);
                    const extSync = await this.notifyPtsAssetExtension('refresh', {
                        uuid: target?.uuid || args?.uuid || '',
                        url: target?.url || args?.url || '',
                        file: target?.file || '',
                        type: args?.className || args?.type || ''
                    });
                    return {
                        success: true,
                        data: {
                            refreshed: extSync.notified,
                            target: target || null,
                            inspectorSync: extSync
                        }
                    };
                }

                default:
                    return { success: false, error: `Unknown pts_asset_manage action: ${action}` };
            }
        } catch (err: any) {
            return {
                success: false,
                error: err?.message || String(err)
            };
        }
    }
}
