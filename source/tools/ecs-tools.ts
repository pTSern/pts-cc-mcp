import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { isEcsAvailable, resolveProjectRoot } from '../utils/ecs-checker';

declare const Editor: any;

const PRIMITIVE_TYPES = new Set([
    'float', 'int', 'string', 'boolean', 'object', 'Int32Array', 'Uint32Array'
]);

interface EcsPropDef {
    name: string;
    kind: 'primitive' | 'cocos' | 'component';
    type: string;
    complex: 'single' | 'array' | 'set' | 'map';
    defaultValue?: string;
    tsType?: string;
}

interface EcsComponentDef {
    name: string;
    props: EcsPropDef[];
}

interface EcsWorldDef {
    name: string;
    components: string[];
    max_entities: number | 'Infinity';
    auto_boost: boolean;
    event_mode?: 'primitive' | 'manual';
    events?: string[];
}

interface EcsSchema {
    components: EcsComponentDef[];
    worlds: EcsWorldDef[];
}

export class EcsTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'ecs_manage',
                description: 'HEADLESS pTS-ECS MANAGER: Directly inspect, create, update, remove ECS Components and Worlds, configure typed world events (primitive vs manual), list available engine Component/Asset subclasses, and regenerate _$secret/ecs.components.(js|d.ts) & ecs.worlds.(js|d.ts) without opening the UI panel.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: [
                                'get_schema',
                                'list_engine_types',
                                'create_component',
                                'update_component',
                                'remove_component',
                                'create_world',
                                'update_world',
                                'remove_world',
                                'regenerate'
                            ],
                            description: 'ECS headless action opcode'
                        },
                        name: {
                            type: 'string',
                            description: 'Component or World name'
                        },
                        newName: {
                            type: 'string',
                            description: 'New name when renaming a component or world via update_component / update_world'
                        },
                        props: {
                            type: 'array',
                            description: 'Component properties array for create_component / update_component',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', description: 'Property identifier (e.g. "x", "hp")' },
                                    kind: { type: 'string', enum: ['primitive', 'cocos', 'component'], description: 'Optional; auto-inferred from type if omitted' },
                                    type: { type: 'string', description: 'Type name: primitive (float|int|string|boolean|object|Int32Array|Uint32Array), Cocos class (e.g. "cc.Node", "cc.Sprite", "Config_Enemy"), or existing ECS Component name' },
                                    complex: { type: 'string', enum: ['single', 'array', 'set', 'map'], default: 'single', description: 'Container wrapper mode' },
                                    defaultValue: { type: 'string', description: 'Optional default value (or TypedArray length for Int32Array/Uint32Array)' },
                                    tsType: { type: 'string', description: 'Optional explicit TS type for custom Cocos/Asset classes' }
                                },
                                required: ['name', 'type']
                            }
                        },
                        components: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Registered ECS component names for create_world / update_world'
                        },
                        max_entities: {
                            description: 'Max entity capacity for world: positive integer (e.g. 5000) or "Infinity"'
                        },
                        auto_boost: {
                            type: 'boolean',
                            default: true,
                            description: 'Instantiate world immediately on game boot (true) or lazily on first ecs.get_world() (false)'
                        },
                        event_mode: {
                            type: 'string',
                            enum: ['primitive', 'manual'],
                            default: 'primitive',
                            description: 'World event channel typing: "primitive" (string | symbol) or "manual" (explicit string literal union from events[])'
                        },
                        events: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Explicit typed event channel names when event_mode is "manual" (e.g. ["on_hit", "on_move"])'
                        },
                        overwrite: {
                            type: 'boolean',
                            default: false,
                            description: 'For create_component / create_world: overwrite if name already exists'
                        },
                        force: {
                            type: 'boolean',
                            default: false,
                            description: 'For remove_component: force delete even if referenced by other components or worlds (strips references)'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    private async loadSchema(): Promise<EcsSchema> {
        if (typeof Editor !== 'undefined' && Editor?.Message?.request) {
            try {
                const res = await Editor.Message.request('pts-ecs', 'get-schema');
                if (res && typeof res === 'object') {
                    return {
                        components: Array.isArray(res.components) ? res.components : [],
                        worlds: Array.isArray(res.worlds) ? res.worlds : []
                    };
                }
            } catch {}
        }

        const root = resolveProjectRoot();
        const profilePath = path.join(root, 'settings', 'v2', 'packages', 'pts-ecs.json');
        if (fs.existsSync(profilePath)) {
            const parsed = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
            return {
                components: Array.isArray(parsed?.components) ? parsed.components : [],
                worlds: Array.isArray(parsed?.worlds) ? parsed.worlds : []
            };
        }
        return { components: [], worlds: [] };
    }

    private async saveSchema(schema: EcsSchema): Promise<{ ok: boolean; errors?: string[]; mode: 'ipc' | 'fs' }> {
        if (typeof Editor !== 'undefined' && Editor?.Message?.request) {
            try {
                const res = await Editor.Message.request('pts-ecs', 'save-schema', schema);
                if (res && typeof res === 'object' && 'ok' in res) {
                    return { ok: !!res.ok, errors: res.errors, mode: 'ipc' };
                }
            } catch {}
        }

        // Headless FS fallback using pts-ecs compiled validator & codegen
        const root = resolveProjectRoot();
        const extDist = path.join(root, 'extensions', 'pts-ecs', 'dist');
        const validatorMod = require(path.join(extDist, 'validator.js'));
        const codegenMod = require(path.join(extDist, 'codegen.js'));

        const validation = validatorMod.validateSchema(schema);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors, mode: 'fs' };
        }

        const profilePath = path.join(root, 'settings', 'v2', 'packages', 'pts-ecs.json');
        fs.mkdirSync(path.dirname(profilePath), { recursive: true });
        let existing: any = { __version__: '1.0.0' };
        if (fs.existsSync(profilePath)) {
            try { existing = JSON.parse(fs.readFileSync(profilePath, 'utf8')); } catch {}
        }
        existing.components = schema.components;
        existing.worlds = schema.worlds;
        fs.writeFileSync(profilePath, JSON.stringify(existing, null, 2), 'utf8');

        const secretDir = path.join(root, 'extensions', 'pts-ecs', 'assets', '_$secret');
        fs.mkdirSync(secretDir, { recursive: true });
        fs.writeFileSync(path.join(secretDir, 'ecs.components.js'), codegenMod.generateComponentsJs(schema.components), 'utf8');
        fs.writeFileSync(path.join(secretDir, 'ecs.components.d.ts'), codegenMod.generateComponentsDts(schema.components), 'utf8');
        fs.writeFileSync(path.join(secretDir, 'ecs.worlds.js'), codegenMod.generateWorldsJs(schema.worlds), 'utf8');
        fs.writeFileSync(path.join(secretDir, 'ecs.worlds.d.ts'), codegenMod.generateWorldsDts(schema.worlds), 'utf8');

        if (typeof Editor !== 'undefined' && Editor?.Message?.request) {
            await Editor.Message.request('asset-db', 'refresh-asset', 'db://pts-ecs/_$secret').catch(() => {});
        }
        return { ok: true, mode: 'fs' };
    }

    private async listEngineTypes(): Promise<any> {
        if (typeof Editor !== 'undefined' && Editor?.Message?.request) {
            try {
                const res = await Editor.Message.request('pts-ecs', 'list-engine-types');
                if (res) return res;
            } catch {}
        }
        return { nodes: [{ name: 'cc.Node', tsType: 'import("cc").Node' }], components: [], assets: [] };
    }

    private normalizeProps(rawProps: any[], existingCompNames: Set<string>, engineLookup: Map<string, string>): EcsPropDef[] {
        if (!Array.isArray(rawProps)) return [];
        return rawProps.map((p: any) => {
            const typeStr = String(p?.type ?? '').trim();
            let kind: 'primitive' | 'cocos' | 'component' = p?.kind;
            if (kind !== 'primitive' && kind !== 'cocos' && kind !== 'component') {
                if (PRIMITIVE_TYPES.has(typeStr)) {
                    kind = 'primitive';
                } else if (existingCompNames.has(typeStr)) {
                    kind = 'component';
                } else {
                    kind = 'cocos';
                }
            }
            const complexRaw = String(p?.complex ?? 'single').toLowerCase();
            const complex = (['single', 'array', 'set', 'map'].includes(complexRaw) ? complexRaw : 'single') as EcsPropDef['complex'];
            const out: EcsPropDef = {
                name: String(p?.name ?? '').trim(),
                kind,
                type: typeStr,
                complex,
                defaultValue: p?.defaultValue !== undefined ? String(p.defaultValue) : ''
            };
            if (kind === 'cocos') {
                const resolvedTs = p?.tsType || engineLookup.get(typeStr) || engineLookup.get(`cc.${typeStr}`);
                if (resolvedTs) out.tsType = resolvedTs;
            }
            return out;
        });
    }

    private normalizeMaxEntities(val: any, fallback: number | 'Infinity' = 'Infinity'): number | 'Infinity' {
        if (val === undefined || val === null || val === '') return fallback;
        if (val === 'Infinity' || val === Infinity || String(val).toLowerCase() === 'infinity') {
            return 'Infinity';
        }
        const n = Math.floor(Number(val));
        return Number.isFinite(n) && n >= 1 ? n : fallback;
    }

    async execute(_toolName: string, args: any): Promise<ToolResponse> {
        if (!isEcsAvailable()) {
            return {
                success: false,
                error: 'pts-ecs extension is not installed or is disabled in the current project.'
            };
        }

        const action = args?.action;
        if (!action) {
            return { success: false, error: 'Missing required parameter: action' };
        }

        try {
            switch (action) {
                case 'get_schema': {
                    const schema = await this.loadSchema();
                    return {
                        success: true,
                        data: schema,
                        message: `Loaded ${schema.components.length} component(s) and ${schema.worlds.length} world(s)`
                    };
                }

                case 'list_engine_types': {
                    const types = await this.listEngineTypes();
                    return {
                        success: true,
                        data: types,
                        message: `Discovered ${types?.components?.length || 0} Component(s) & ${types?.assets?.length || 0} Asset(s)`
                    };
                }

                case 'regenerate': {
                    if (typeof Editor !== 'undefined' && Editor?.Message?.request) {
                        try {
                            const res = await Editor.Message.request('pts-ecs', 'regenerate');
                            if (res && typeof res === 'object' && 'ok' in res) {
                                return res.ok
                                    ? { success: true, message: 'Regenerated _$secret/ecs.components.(js|d.ts) & ecs.worlds.(js|d.ts)' }
                                    : { success: false, error: (res.errors || ['Regenerate failed']).join('; ') };
                            }
                        } catch {}
                    }
                    const schema = await this.loadSchema();
                    const saved = await this.saveSchema(schema);
                    return saved.ok
                        ? { success: true, message: `Regenerated _$secret files (${saved.mode})` }
                        : { success: false, error: (saved.errors || ['Regenerate failed']).join('; ') };
                }

                case 'create_component':
                case 'update_component': {
                    const name = String(args?.name ?? '').trim();
                    if (!name) return { success: false, error: 'Missing required parameter: name' };

                    const schema = await this.loadSchema();
                    const existingIdx = schema.components.findIndex(c => c.name === name);
                    if (action === 'create_component' && existingIdx >= 0 && !args?.overwrite) {
                        return {
                            success: false,
                            error: `Component "${name}" already exists. Use action="update_component" or pass overwrite=true.`
                        };
                    }
                    if (action === 'update_component' && existingIdx < 0) {
                        return { success: false, error: `Component "${name}" not found.` };
                    }

                    const targetName = (action === 'update_component' && args?.newName)
                        ? String(args.newName).trim()
                        : name;

                    const compNames = new Set(schema.components.map(c => c.name));
                    compNames.add(targetName);

                    const engineLookup = new Map<string, string>();
                    const needsEngineLookup = Array.isArray(args?.props) && args.props.some((p: any) => !PRIMITIVE_TYPES.has(String(p?.type || '')) && !compNames.has(String(p?.type || '')));
                    if (needsEngineLookup) {
                        const eng = await this.listEngineTypes();
                        for (const item of [...(eng?.nodes || []), ...(eng?.components || []), ...(eng?.assets || [])]) {
                            if (item?.name && item?.tsType) engineLookup.set(item.name, item.tsType);
                        }
                    }

                    const props = args?.props !== undefined
                        ? this.normalizeProps(args.props, compNames, engineLookup)
                        : (existingIdx >= 0 ? schema.components[existingIdx].props : []);

                    const def: EcsComponentDef = { name: targetName, props };
                    if (existingIdx >= 0) {
                        schema.components[existingIdx] = def;
                        if (targetName !== name) {
                            for (const c of schema.components) {
                                for (const p of c.props) {
                                    if (p.kind === 'component' && p.type === name) p.type = targetName;
                                }
                            }
                            for (const w of schema.worlds) {
                                w.components = w.components.map(cn => (cn === name ? targetName : cn));
                            }
                        }
                    } else {
                        schema.components.push(def);
                    }

                    const saved = await this.saveSchema(schema);
                    if (!saved.ok) {
                        return { success: false, error: (saved.errors || ['Validation failed']).join('; ') };
                    }
                    return {
                        success: true,
                        data: { component: def, mode: saved.mode },
                        message: `${existingIdx >= 0 ? 'Updated' : 'Created'} ECS component "${targetName}" (${def.props.length} props) & regenerated _$secret files`
                    };
                }

                case 'remove_component': {
                    const name = String(args?.name ?? '').trim();
                    if (!name) return { success: false, error: 'Missing required parameter: name' };

                    const schema = await this.loadSchema();
                    const idx = schema.components.findIndex(c => c.name === name);
                    if (idx < 0) {
                        return { success: false, error: `Component "${name}" not found.` };
                    }

                    const refComps = schema.components
                        .filter(c => c.name !== name && c.props.some(p => p.kind === 'component' && p.type === name))
                        .map(c => c.name);
                    const refWorlds = schema.worlds
                        .filter(w => w.components.includes(name))
                        .map(w => w.name);

                    if ((refComps.length > 0 || refWorlds.length > 0) && !args?.force) {
                        return {
                            success: false,
                            error: `Component "${name}" is still referenced by ${[
                                refComps.length ? `components [${refComps.join(', ')}]` : '',
                                refWorlds.length ? `worlds [${refWorlds.join(', ')}]` : ''
                            ].filter(Boolean).join(' and ')}. Pass force=true to strip references and delete.`
                        };
                    }

                    schema.components.splice(idx, 1);
                    if (args?.force) {
                        for (const c of schema.components) {
                            c.props = c.props.filter(p => !(p.kind === 'component' && p.type === name));
                        }
                        for (const w of schema.worlds) {
                            w.components = w.components.filter(cn => cn !== name);
                        }
                    }

                    const saved = await this.saveSchema(schema);
                    if (!saved.ok) {
                        return { success: false, error: (saved.errors || ['Save failed']).join('; ') };
                    }
                    return {
                        success: true,
                        data: { removed: name, strippedFromComponents: refComps, strippedFromWorlds: refWorlds },
                        message: `Removed ECS component "${name}" & regenerated _$secret files`
                    };
                }

                case 'create_world':
                case 'update_world': {
                    const name = String(args?.name ?? '').trim();
                    if (!name) return { success: false, error: 'Missing required parameter: name' };

                    const schema = await this.loadSchema();
                    const existingIdx = schema.worlds.findIndex(w => w.name === name);
                    if (action === 'create_world' && existingIdx >= 0 && !args?.overwrite) {
                        return {
                            success: false,
                            error: `World "${name}" already exists. Use action="update_world" or pass overwrite=true.`
                        };
                    }
                    if (action === 'update_world' && existingIdx < 0) {
                        return { success: false, error: `World "${name}" not found.` };
                    }

                    const prev = existingIdx >= 0 ? schema.worlds[existingIdx] : null;
                    const targetName = (action === 'update_world' && args?.newName)
                        ? String(args.newName).trim()
                        : name;

                    const components: string[] = Array.isArray(args?.components)
                        ? Array.from(new Set<string>(args.components.map((c: any) => String(c).trim()).filter(Boolean)))
                        : (prev ? prev.components : []);

                    const max_entities = this.normalizeMaxEntities(
                        args?.max_entities,
                        prev ? prev.max_entities : 'Infinity'
                    );
                    const auto_boost = typeof args?.auto_boost === 'boolean'
                        ? args.auto_boost
                        : (prev ? prev.auto_boost : true);

                    let event_mode: 'primitive' | 'manual' =
                        args?.event_mode === 'manual' || args?.event_mode === 'primitive'
                            ? args.event_mode
                            : (Array.isArray(args?.events) && args.events.length > 0
                                ? 'manual'
                                : (prev?.event_mode ?? 'primitive'));

                    const events = event_mode === 'manual'
                        ? (Array.isArray(args?.events)
                            ? args.events.map((e: any) => String(e ?? '').trim()).filter(Boolean)
                            : (prev?.events || []))
                        : [];

                    const def: EcsWorldDef = {
                        name: targetName,
                        components,
                        max_entities,
                        auto_boost,
                        event_mode,
                        events
                    };

                    if (existingIdx >= 0) {
                        schema.worlds[existingIdx] = def;
                    } else {
                        schema.worlds.push(def);
                    }

                    const saved = await this.saveSchema(schema);
                    if (!saved.ok) {
                        return { success: false, error: (saved.errors || ['Validation failed']).join('; ') };
                    }
                    return {
                        success: true,
                        data: { world: def, mode: saved.mode },
                        message: `${existingIdx >= 0 ? 'Updated' : 'Created'} ECS world "${targetName}" (${def.components.length} components, events: ${def.event_mode}) & regenerated _$secret files`
                    };
                }

                case 'remove_world': {
                    const name = String(args?.name ?? '').trim();
                    if (!name) return { success: false, error: 'Missing required parameter: name' };

                    const schema = await this.loadSchema();
                    const idx = schema.worlds.findIndex(w => w.name === name);
                    if (idx < 0) {
                        return { success: false, error: `World "${name}" not found.` };
                    }

                    schema.worlds.splice(idx, 1);
                    const saved = await this.saveSchema(schema);
                    if (!saved.ok) {
                        return { success: false, error: (saved.errors || ['Save failed']).join('; ') };
                    }
                    return {
                        success: true,
                        data: { removed: name },
                        message: `Removed ECS world "${name}" & regenerated _$secret files`
                    };
                }

                default:
                    return { success: false, error: `Unknown ecs_manage action: ${action}` };
            }
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }
}
