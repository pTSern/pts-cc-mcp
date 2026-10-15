import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

declare const Editor: any;

export interface KeyframeDefinition {
    time: number;
    value: number | number[];
    interpolationMode?: number | 'LINEAR' | 'CONSTANT' | 'CUBIC';
    tangentWeightMode?: number;
    rightTangent?: number;
    leftTangent?: number;
}

export interface TrackDefinition {
    property: 'position' | 'scale' | 'eulerAngles' | 'color' | 'opacity' | string;
    nodePath?: string;
    nComponents?: number;
    keyframes?: KeyframeDefinition[];
}

export interface AnimationEventDefinition {
    frame: number;
    func: string;
    params?: any[];
}

export interface FbxSliceDefinition {
    name: string;
    from: number;
    to: number;
    wrapMode?: number;
    speed?: number;
    sample?: number;
}

export class AnimationTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'animation_editor',
                description: 'TIMELINE ANIMATION & KEYFRAME TRACK EDITOR: Direct authoring of Cocos Creator .anim (cc.AnimationClip) files and FBX multi-take animation slicing. Supports track manipulation (position, rotation, scale), keyframe CRUD with curve easing (Linear, Constant, Cubic Bezier), animation events, preset generation (fade, bounce, shake, button press), and FBX animation take splitting.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: [
                                'clip_inspect',
                                'clip_create',
                                'clip_add_track',
                                'clip_remove_track',
                                'clip_add_keyframe',
                                'clip_remove_keyframe',
                                'clip_add_event',
                                'clip_remove_event',
                                'clip_apply_preset',
                                'slice_fbx'
                            ],
                            description: 'Action opcode for timeline animation manipulation or FBX slicing'
                        },
                        animPath: {
                            type: 'string',
                            description: 'Path to target .anim asset (e.g. "db://assets/anims/hero_walk.anim" or relative to project)'
                        },
                        name: {
                            type: 'string',
                            description: 'Animation clip name'
                        },
                        duration: {
                            type: 'number',
                            description: 'Animation duration in seconds (defaults to 1.0)'
                        },
                        sample: {
                            type: 'number',
                            description: 'Sample rate per second (defaults to 60)'
                        },
                        speed: {
                            type: 'number',
                            description: 'Playback speed factor (defaults to 1.0)'
                        },
                        wrapMode: {
                            type: 'number',
                            description: 'Wrap mode: 0 = Normal, 1 = Loop, 2 = PingPong, 22 = Reverse (defaults to 1)'
                        },
                        property: {
                            type: 'string',
                            enum: ['position', 'scale', 'eulerAngles', 'color', 'opacity'],
                            description: 'Target property track name'
                        },
                        nodePath: {
                            type: 'string',
                            description: 'Hierarchy path to target child node (empty string or omitted targets clip root node)'
                        },
                        time: {
                            type: 'number',
                            description: 'Keyframe timestamp in seconds'
                        },
                        value: {
                            description: 'Keyframe value: array for vectors (e.g. [0, 10, 0]) or scalar number'
                        },
                        interpolationMode: {
                            type: 'string',
                            enum: ['LINEAR', 'CONSTANT', 'CUBIC'],
                            description: 'Keyframe interpolation curve mode (defaults to LINEAR)'
                        },
                        frame: {
                            type: 'number',
                            description: 'Animation event frame timestamp in seconds'
                        },
                        func: {
                            type: 'string',
                            description: 'Trigger function name for animation event'
                        },
                        params: {
                            type: 'array',
                            description: 'Optional arguments array passed to trigger function'
                        },
                        presetName: {
                            type: 'string',
                            enum: ['fade_in', 'fade_out', 'bounce_pop', 'shake', 'button_press', 'pulse', 'spin'],
                            description: 'Pre-designed motion preset to apply'
                        },
                        // FBX Slicing properties
                        fbxMetaPath: {
                            type: 'string',
                            description: 'Path to FBX asset or .fbx.meta (e.g. "db://assets/fbx/Character.fbx")'
                        },
                        animations: {
                            type: 'array',
                            description: 'List of animation slice takes: [{ name, from, to, wrapMode, speed }]',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', description: 'Take name (e.g. "Idle", "Attack", "Run")' },
                                    from: { type: 'number', description: 'Start time in seconds' },
                                    to: { type: 'number', description: 'End time in seconds' },
                                    wrapMode: { type: 'number', default: 2, description: 'Wrap mode (1: Normal, 2: Loop)' },
                                    speed: { type: 'number', default: 1 }
                                },
                                required: ['name', 'from', 'to']
                            }
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        const action = args?.action;
        switch (action) {
            case 'clip_inspect':
                return await this.inspectClip(args?.animPath);
            case 'clip_create':
                return await this.createClip(args?.animPath, args);
            case 'clip_add_track':
                return await this.addTrack(args?.animPath, args);
            case 'clip_remove_track':
                return await this.removeTrack(args?.animPath, args);
            case 'clip_add_keyframe':
                return await this.addKeyframe(args?.animPath, args);
            case 'clip_remove_keyframe':
                return await this.removeKeyframe(args?.animPath, args);
            case 'clip_add_event':
                return await this.addEvent(args?.animPath, args);
            case 'clip_remove_event':
                return await this.removeEvent(args?.animPath, args);
            case 'clip_apply_preset':
                return await this.applyPreset(args?.animPath, args?.presetName, args);
            case 'slice_fbx':
                return await this.sliceFbx(args?.fbxMetaPath || args?.animPath, args?.animations);
            default:
                return {
                    success: false,
                    error: `Unknown action: "${action}". Valid actions: ["clip_inspect", "clip_create", "clip_add_track", "clip_remove_track", "clip_add_keyframe", "clip_remove_keyframe", "clip_add_event", "clip_remove_event", "clip_apply_preset", "slice_fbx"]`
                };
        }
    }

    public async resolveFsPath(assetPath: string): Promise<string | null> {
        if (!assetPath) return null;

        // Try Editor asset-db query
        if (typeof Editor !== 'undefined' && Editor.Message) {
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', assetPath);
                if (info && info.file && fs.existsSync(info.file)) {
                    return info.file;
                }
            } catch {}
        }

        // Direct filesystem path
        if (path.isAbsolute(assetPath) && fs.existsSync(assetPath)) {
            return assetPath;
        }

        // Relative to project root
        const projectRoot = (typeof Editor !== 'undefined' && Editor.Project && Editor.Project.path)
            ? Editor.Project.path
            : process.cwd();

        let cleanPath = assetPath.replace(/^db:\/\/assets\//, 'assets/');
        const candidate = path.resolve(projectRoot, cleanPath);
        if (fs.existsSync(candidate)) {
            return candidate;
        }

        // Also check if directory exists for creating new file
        const candidateDir = path.dirname(candidate);
        if (fs.existsSync(candidateDir)) {
            return candidate;
        }

        return candidate;
    }

    /**
     * Inspect an existing .anim asset and parse its tracks, curves, and events
     */
    public async inspectClip(animPath: string): Promise<ToolResponse> {
        const filePath = await this.resolveFsPath(animPath);
        if (!filePath || !fs.existsSync(filePath)) {
            return { success: false, error: `AnimationClip file not found: ${animPath}` };
        }

        try {
            const rawContent = fs.readFileSync(filePath, 'utf-8');
            const data: any[] = JSON.parse(rawContent);
            if (!Array.isArray(data) || data.length === 0) {
                return { success: false, error: 'Invalid AnimationClip format: expected array' };
            }

            const clipHeader = data[0];
            const tracksSummary: any[] = [];

            if (Array.isArray(clipHeader._tracks)) {
                for (const trackRef of clipHeader._tracks) {
                    const trackObj = data[trackRef.__id__];
                    if (!trackObj) continue;

                    let targetProperty = '';
                    let targetNode = '';

                    // Resolve TrackPath
                    if (trackObj._binding?.path?.__id__ !== undefined) {
                        const pathObj = data[trackObj._binding.path.__id__];
                        if (pathObj && Array.isArray(pathObj._paths)) {
                            for (const p of pathObj._paths) {
                                if (typeof p === 'string') {
                                    targetProperty = p;
                                } else if (p?.__id__ !== undefined) {
                                    const hierarchyObj = data[p.__id__];
                                    if (hierarchyObj?.path) targetNode = hierarchyObj.path;
                                }
                            }
                        }
                    }

                    // Extract channels and keyframes
                    const channelSummaries: any[] = [];
                    if (Array.isArray(trackObj._channels)) {
                        for (let chIdx = 0; chIdx < trackObj._channels.length; chIdx++) {
                            const chRef = trackObj._channels[chIdx];
                            const chObj = data[chRef.__id__];
                            if (chObj?._curve?.__id__ !== undefined) {
                                const curveObj = data[chObj._curve.__id__];
                                if (curveObj) {
                                    const times = curveObj._times || [];
                                    const values = (curveObj._values || []).map((v: any) => v.value);
                                    channelSummaries.push({
                                        channelIndex: chIdx,
                                        keyframeCount: times.length,
                                        times,
                                        values
                                    });
                                }
                            }
                        }
                    }

                    tracksSummary.push({
                        type: trackObj.__type__,
                        property: targetProperty,
                        nodePath: targetNode || '(root)',
                        nComponents: trackObj._nComponents,
                        channels: channelSummaries
                    });
                }
            }

            return {
                success: true,
                message: `Inspected AnimationClip: ${clipHeader._name || path.basename(filePath)}`,
                data: {
                    name: clipHeader._name,
                    duration: clipHeader._duration,
                    sample: clipHeader.sample,
                    speed: clipHeader.speed,
                    wrapMode: clipHeader.wrapMode,
                    trackCount: tracksSummary.length,
                    tracks: tracksSummary,
                    events: clipHeader._events || []
                }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to inspect clip: ${err.message}` };
        }
    }

    /**
     * Create a new empty .anim AnimationClip asset
     */
    public async createClip(animPath: string, options: any): Promise<ToolResponse> {
        const filePath = await this.resolveFsPath(animPath);
        if (!filePath) {
            return { success: false, error: `Invalid animation path: ${animPath}` };
        }

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const clipName = options?.name || path.basename(filePath, '.anim');
        const duration = options?.duration !== undefined ? Number(options.duration) : 1.0;
        const sample = options?.sample !== undefined ? Number(options.sample) : 60;
        const speed = options?.speed !== undefined ? Number(options.speed) : 1.0;
        const wrapMode = options?.wrapMode !== undefined ? Number(options.wrapMode) : 1;

        const clipData: any[] = [
            {
                __type__: 'cc.AnimationClip',
                _name: clipName,
                _objFlags: 0,
                __editorExtras__: {
                    embeddedPlayerGroups: []
                },
                _native: '',
                sample: sample,
                speed: speed,
                wrapMode: wrapMode,
                enableTrsBlending: false,
                _duration: duration,
                _hash: 500763545,
                _tracks: [],
                _exoticAnimation: null,
                _events: [],
                _embeddedPlayers: [],
                _additiveSettings: {
                    __id__: 1
                },
                _auxiliaryCurveEntries: []
            },
            {
                __type__: 'cc.AnimationClipAdditiveSettings',
                enabled: false,
                refClip: null
            }
        ];

        try {
            fs.writeFileSync(filePath, JSON.stringify(clipData, null, 2), 'utf-8');

            // Generate companion .meta file if missing
            const metaPath = `${filePath}.meta`;
            if (!fs.existsSync(metaPath)) {
                const uuid = crypto.randomUUID();
                const meta = {
                    ver: '1.1.53',
                    importer: 'animation-clip',
                    imported: true,
                    uuid: uuid,
                    files: ['.json'],
                    subMetas: {},
                    userData: {}
                };
                fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
            }

            if (typeof Editor !== 'undefined' && Editor.Message) {
                try {
                    await Editor.Message.request('asset-db', 'refresh-asset', animPath);
                } catch {}
            }

            return {
                success: true,
                message: `Created AnimationClip at ${filePath}`,
                data: {
                    path: filePath,
                    name: clipName,
                    duration,
                    sample,
                    wrapMode
                }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to create clip: ${err.message}` };
        }
    }

    /**
     * Add a property track (VectorTrack) to an AnimationClip
     */
    public async addTrack(animPath: string, options: any): Promise<ToolResponse> {
        const filePath = await this.resolveFsPath(animPath);
        if (!filePath || !fs.existsSync(filePath)) {
            return { success: false, error: `AnimationClip file not found: ${animPath}` };
        }

        const prop = options?.property || 'position';
        const nodePath = options?.nodePath || '';
        const nComponents = options?.nComponents || (prop === 'opacity' ? 1 : 3);

        try {
            const data: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const clip = data[0];

            // Build hierarchy path entry if nodePath specified
            let hierarchyPathId: number | null = null;
            if (nodePath) {
                hierarchyPathId = data.length;
                data.push({
                    __type__: 'cc.animation.HierarchyPath',
                    path: nodePath
                });
            }

            // Build TrackPath entry
            const trackPathId = data.length;
            const trackPaths: any[] = [];
            if (hierarchyPathId !== null) {
                trackPaths.push({ __id__: hierarchyPathId });
            }
            trackPaths.push(prop);
            data.push({
                __type__: 'cc.animation.TrackPath',
                _paths: trackPaths
            });

            // Build 4 channels and 4 curves for VectorTrack
            const channelRefs: any[] = [];
            for (let i = 0; i < 4; i++) {
                const curveId = data.length;
                data.push({
                    __type__: 'cc.RealCurve',
                    _times: [],
                    _values: [],
                    preExtrapolation: 1,
                    postExtrapolation: 1
                });

                const channelId = data.length;
                data.push({
                    __type__: 'cc.animation.Channel',
                    _curve: { __id__: curveId }
                });

                channelRefs.push({ __id__: channelId });
            }

            // Build VectorTrack
            const vectorTrackId = data.length;
            data.push({
                __type__: 'cc.animation.VectorTrack',
                _binding: {
                    __type__: 'cc.animation.TrackBinding',
                    path: { __id__: trackPathId },
                    proxy: null
                },
                _channels: channelRefs,
                _nComponents: nComponents
            });

            // Register track in clip._tracks
            if (!Array.isArray(clip._tracks)) clip._tracks = [];
            clip._tracks.push({ __id__: vectorTrackId });

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

            return {
                success: true,
                message: `Added ${prop} track to ${nodePath || 'root'} in ${path.basename(filePath)}`,
                data: {
                    property: prop,
                    nodePath: nodePath || '(root)',
                    trackId: vectorTrackId
                }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to add track: ${err.message}` };
        }
    }

    /**
     * Remove a property track from an AnimationClip
     */
    public async removeTrack(animPath: string, options: any): Promise<ToolResponse> {
        const filePath = await this.resolveFsPath(animPath);
        if (!filePath || !fs.existsSync(filePath)) {
            return { success: false, error: `AnimationClip file not found: ${animPath}` };
        }

        const prop = options?.property;
        const nodePath = options?.nodePath || '';

        try {
            const data: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const clip = data[0];
            if (!Array.isArray(clip._tracks) || clip._tracks.length === 0) {
                return { success: false, error: 'No tracks found in AnimationClip' };
            }

            const tracksToKeep: any[] = [];
            let removedCount = 0;

            for (const trackRef of clip._tracks) {
                const trackObj = data[trackRef.__id__];
                if (!trackObj) continue;

                let matches = false;
                if (trackObj._binding?.path?.__id__ !== undefined) {
                    const pathObj = data[trackObj._binding.path.__id__];
                    if (pathObj && Array.isArray(pathObj._paths)) {
                        let curProp = '';
                        let curNode = '';
                        for (const p of pathObj._paths) {
                            if (typeof p === 'string') curProp = p;
                            else if (p?.__id__ !== undefined) {
                                const hObj = data[p.__id__];
                                if (hObj?.path) curNode = hObj.path;
                            }
                        }
                        if (curProp === prop && (curNode === nodePath || (!curNode && !nodePath))) {
                            matches = true;
                        }
                    }
                }

                if (matches) {
                    removedCount++;
                } else {
                    tracksToKeep.push(trackRef);
                }
            }

            clip._tracks = tracksToKeep;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

            return {
                success: true,
                message: `Removed ${removedCount} track(s) matching property "${prop}" in ${path.basename(filePath)}`,
                data: { removedCount }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to remove track: ${err.message}` };
        }
    }

    /**
     * Add a keyframe to a property track at time t
     */
    public async addKeyframe(animPath: string, options: any): Promise<ToolResponse> {
        const filePath = await this.resolveFsPath(animPath);
        if (!filePath || !fs.existsSync(filePath)) {
            return { success: false, error: `AnimationClip file not found: ${animPath}` };
        }

        const prop = options?.property || 'position';
        const nodePath = options?.nodePath || '';
        const time = Number(options?.time || 0);
        const rawValue = options?.value;
        const interpMode = options?.interpolationMode === 'CUBIC' ? 2 : options?.interpolationMode === 'CONSTANT' ? 1 : 0;

        let valuesArr: number[] = [];
        if (Array.isArray(rawValue)) {
            valuesArr = rawValue.map(Number);
        } else if (typeof rawValue === 'number') {
            valuesArr = [rawValue];
        } else if (typeof rawValue === 'object' && rawValue !== null) {
            valuesArr = [Number(rawValue.x || 0), Number(rawValue.y || 0), Number(rawValue.z || 0)];
        } else {
            valuesArr = [0, 0, 0];
        }

        try {
            const data: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const clip = data[0];

            // 1. Locate matching track
            let targetTrack: any = null;
            if (Array.isArray(clip._tracks)) {
                for (const trackRef of clip._tracks) {
                    const trackObj = data[trackRef.__id__];
                    if (!trackObj) continue;
                    if (trackObj._binding?.path?.__id__ !== undefined) {
                        const pathObj = data[trackObj._binding.path.__id__];
                        if (pathObj && Array.isArray(pathObj._paths)) {
                            let curProp = '';
                            let curNode = '';
                            for (const p of pathObj._paths) {
                                if (typeof p === 'string') curProp = p;
                                else if (p?.__id__ !== undefined) {
                                    const hObj = data[p.__id__];
                                    if (hObj?.path) curNode = hObj.path;
                                }
                            }
                            if (curProp === prop && (curNode === nodePath || (!curNode && !nodePath))) {
                                targetTrack = trackObj;
                                break;
                            }
                        }
                    }
                }
            }

            // 2. If track doesn't exist, create it first
            if (!targetTrack) {
                await this.addTrack(animPath, { property: prop, nodePath });
                return await this.addKeyframe(animPath, options);
            }

            // 3. Insert keyframe values into each component channel curve
            const channels = targetTrack._channels || [];
            for (let i = 0; i < channels.length; i++) {
                if (i >= valuesArr.length) break;
                const chObj = data[channels[i].__id__];
                if (!chObj || chObj._curve?.__id__ === undefined) continue;

                const curve = data[chObj._curve.__id__];
                if (!curve) continue;

                if (!Array.isArray(curve._times)) curve._times = [];
                if (!Array.isArray(curve._values)) curve._values = [];

                const val = valuesArr[i];
                const keyframeVal = {
                    __type__: 'cc.RealKeyframeValue',
                    interpolationMode: interpMode,
                    tangentWeightMode: 0,
                    value: val,
                    rightTangent: 0,
                    rightTangentWeight: 1,
                    leftTangent: 0,
                    leftTangentWeight: 1,
                    easingMethod: 0,
                    __editorExtras__: {
                        tangentMode: 0
                    }
                };

                // Find insertion index or replace if exact time exists
                const existingIdx = curve._times.findIndex((t: number) => Math.abs(t - time) < 0.0001);
                if (existingIdx !== -1) {
                    curve._values[existingIdx] = keyframeVal;
                } else {
                    let insertIdx = curve._times.findIndex((t: number) => t > time);
                    if (insertIdx === -1) insertIdx = curve._times.length;
                    curve._times.splice(insertIdx, 0, time);
                    curve._values.splice(insertIdx, 0, keyframeVal);
                }
            }

            // Update clip duration if keyframe extends beyond current duration
            if (time > clip._duration) {
                clip._duration = Math.ceil(time * 100) / 100;
            }

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

            return {
                success: true,
                message: `Added keyframe at ${time}s for ${prop} in ${path.basename(filePath)}`,
                data: {
                    property: prop,
                    time,
                    values: valuesArr,
                    clipDuration: clip._duration
                }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to add keyframe: ${err.message}` };
        }
    }

    /**
     * Remove keyframe at timestamp t from a property track
     */
    public async removeKeyframe(animPath: string, options: any): Promise<ToolResponse> {
        const filePath = await this.resolveFsPath(animPath);
        if (!filePath || !fs.existsSync(filePath)) {
            return { success: false, error: `AnimationClip file not found: ${animPath}` };
        }

        const prop = options?.property;
        const nodePath = options?.nodePath || '';
        const time = Number(options?.time);

        try {
            const data: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const clip = data[0];

            let removedTotal = 0;
            if (Array.isArray(clip._tracks)) {
                for (const trackRef of clip._tracks) {
                    const trackObj = data[trackRef.__id__];
                    if (!trackObj) continue;

                    // Match property
                    if (trackObj._binding?.path?.__id__ !== undefined) {
                        const pathObj = data[trackObj._binding.path.__id__];
                        if (pathObj && Array.isArray(pathObj._paths)) {
                            let curProp = '';
                            let curNode = '';
                            for (const p of pathObj._paths) {
                                if (typeof p === 'string') curProp = p;
                                else if (p?.__id__ !== undefined) {
                                    const hObj = data[p.__id__];
                                    if (hObj?.path) curNode = hObj.path;
                                }
                            }
                            if (curProp !== prop || (nodePath && curNode !== nodePath)) continue;
                        }
                    }

                    for (const chRef of trackObj._channels || []) {
                        const chObj = data[chRef.__id__];
                        if (!chObj?._curve?.__id__) continue;
                        const curve = data[chObj._curve.__id__];
                        if (!curve || !Array.isArray(curve._times)) continue;

                        const idx = curve._times.findIndex((t: number) => Math.abs(t - time) < 0.0001);
                        if (idx !== -1) {
                            curve._times.splice(idx, 1);
                            curve._values.splice(idx, 1);
                            removedTotal++;
                        }
                    }
                }
            }

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

            return {
                success: true,
                message: `Removed keyframe at ${time}s for ${prop} in ${path.basename(filePath)}`,
                data: { removedKeyframes: removedTotal }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to remove keyframe: ${err.message}` };
        }
    }

    /**
     * Add an animation event at frame time
     */
    public async addEvent(animPath: string, options: any): Promise<ToolResponse> {
        const filePath = await this.resolveFsPath(animPath);
        if (!filePath || !fs.existsSync(filePath)) {
            return { success: false, error: `AnimationClip file not found: ${animPath}` };
        }

        const frame = Number(options?.frame || 0);
        const func = options?.func;
        if (!func) {
            return { success: false, error: 'Event function name (func) is required' };
        }
        const params = Array.isArray(options?.params) ? options.params : [];

        try {
            const data: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const clip = data[0];
            if (!Array.isArray(clip._events)) clip._events = [];

            clip._events.push({
                frame,
                func,
                params
            });

            // Sort events by frame time
            clip._events.sort((a: any, b: any) => a.frame - b.frame);

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

            return {
                success: true,
                message: `Added animation event "${func}" at ${frame}s in ${path.basename(filePath)}`,
                data: { event: { frame, func, params } }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to add event: ${err.message}` };
        }
    }

    /**
     * Remove animation event
     */
    public async removeEvent(animPath: string, options: any): Promise<ToolResponse> {
        const filePath = await this.resolveFsPath(animPath);
        if (!filePath || !fs.existsSync(filePath)) {
            return { success: false, error: `AnimationClip file not found: ${animPath}` };
        }

        const func = options?.func;
        const frame = options?.frame !== undefined ? Number(options.frame) : undefined;

        try {
            const data: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const clip = data[0];
            if (!Array.isArray(clip._events) || clip._events.length === 0) {
                return { success: false, error: 'No events found in AnimationClip' };
            }

            const initialCount = clip._events.length;
            clip._events = clip._events.filter((ev: any) => {
                if (func && ev.func === func) return false;
                if (frame !== undefined && Math.abs(ev.frame - frame) < 0.0001) return false;
                return true;
            });

            const removed = initialCount - clip._events.length;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

            return {
                success: true,
                message: `Removed ${removed} event(s) in ${path.basename(filePath)}`,
                data: { removedCount: removed }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to remove event: ${err.message}` };
        }
    }

    /**
     * Apply a pre-designed motion preset to an AnimationClip
     */
    public async applyPreset(animPath: string, presetName: string, options: any): Promise<ToolResponse> {
        // Ensure clip exists or create it
        let filePath = await this.resolveFsPath(animPath);
        if (!filePath || !fs.existsSync(filePath)) {
            const createRes = await this.createClip(animPath, { name: presetName, wrapMode: 0 });
            if (!createRes.success) return createRes;
            filePath = await this.resolveFsPath(animPath);
        }

        const nodePath = options?.nodePath || '';

        switch (presetName) {
            case 'fade_in': {
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0, value: [0, 0, 1] });
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0.3, value: [1, 1, 1], interpolationMode: 'CUBIC' });
                return { success: true, message: `Applied "fade_in" motion preset to ${path.basename(filePath!)}` };
            }

            case 'fade_out': {
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0, value: [1, 1, 1] });
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0.3, value: [0, 0, 1], interpolationMode: 'CUBIC' });
                return { success: true, message: `Applied "fade_out" motion preset to ${path.basename(filePath!)}` };
            }

            case 'bounce_pop': {
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0, value: [0, 0, 1] });
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0.2, value: [1.18, 1.18, 1], interpolationMode: 'CUBIC' });
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0.3, value: [0.94, 0.94, 1], interpolationMode: 'CUBIC' });
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0.4, value: [1.0, 1.0, 1], interpolationMode: 'CUBIC' });
                return { success: true, message: `Applied "bounce_pop" motion preset to ${path.basename(filePath!)}` };
            }

            case 'shake': {
                await this.addKeyframe(animPath, { property: 'position', nodePath, time: 0, value: [0, 0, 0] });
                await this.addKeyframe(animPath, { property: 'position', nodePath, time: 0.08, value: [-12, 0, 0] });
                await this.addKeyframe(animPath, { property: 'position', nodePath, time: 0.16, value: [10, 0, 0] });
                await this.addKeyframe(animPath, { property: 'position', nodePath, time: 0.24, value: [-6, 0, 0] });
                await this.addKeyframe(animPath, { property: 'position', nodePath, time: 0.32, value: [4, 0, 0] });
                await this.addKeyframe(animPath, { property: 'position', nodePath, time: 0.4, value: [0, 0, 0] });
                return { success: true, message: `Applied "shake" motion preset to ${path.basename(filePath!)}` };
            }

            case 'button_press': {
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0, value: [1, 1, 1] });
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0.08, value: [0.92, 0.92, 1] });
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0.16, value: [1, 1, 1] });
                return { success: true, message: `Applied "button_press" motion preset to ${path.basename(filePath!)}` };
            }

            case 'pulse': {
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0, value: [1, 1, 1] });
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0.4, value: [1.08, 1.08, 1], interpolationMode: 'CUBIC' });
                await this.addKeyframe(animPath, { property: 'scale', nodePath, time: 0.8, value: [1, 1, 1], interpolationMode: 'CUBIC' });
                return { success: true, message: `Applied "pulse" motion preset to ${path.basename(filePath!)}` };
            }

            case 'spin': {
                await this.addKeyframe(animPath, { property: 'eulerAngles', nodePath, time: 0, value: [0, 0, 0] });
                await this.addKeyframe(animPath, { property: 'eulerAngles', nodePath, time: 1.0, value: [0, 0, 360], interpolationMode: 'LINEAR' });
                return { success: true, message: `Applied "spin" motion preset to ${path.basename(filePath!)}` };
            }

            default:
                return {
                    success: false,
                    error: `Unknown preset: "${presetName}". Supported presets: ["fade_in", "fade_out", "bounce_pop", "shake", "button_press", "pulse", "spin"]`
                };
        }
    }

    /**
     * Slice FBX animations into discrete subMetas animation takes (like Push_All.fbx)
     */
    public async sliceFbx(fbxMetaPath: string, animations: FbxSliceDefinition[]): Promise<ToolResponse> {
        let metaFilePath = await this.resolveFsPath(fbxMetaPath);
        if (!metaFilePath) {
            return { success: false, error: `Invalid FBX path: ${fbxMetaPath}` };
        }

        if (!metaFilePath.endsWith('.meta')) {
            metaFilePath = `${metaFilePath}.meta`;
        }

        if (!fs.existsSync(metaFilePath)) {
            return { success: false, error: `FBX meta file not found: ${metaFilePath}` };
        }

        if (!Array.isArray(animations) || animations.length === 0) {
            return { success: false, error: 'animations list is required for slice_fbx' };
        }

        try {
            const metaContent = JSON.parse(fs.readFileSync(metaFilePath, 'utf-8'));
            const parentUuid = metaContent.uuid;
            if (!parentUuid) {
                return { success: false, error: 'Missing UUID in FBX meta file' };
            }

            if (!metaContent.subMetas) metaContent.subMetas = {};
            if (!metaContent.userData) metaContent.userData = {};

            // Determine imageOptimizer.animations or userData.animations array
            const createdSubMetas: any[] = [];
            const animationEntries: any[] = [];

            for (const anim of animations) {
                // Generate a deterministic 5-character ID from animation name
                const subId = crypto.createHash('md5').update(anim.name).digest('hex').slice(0, 5);
                const subUuid = `${parentUuid}@${subId}`;

                // Setup subMeta definition
                metaContent.subMetas[subId] = {
                    importer: 'gltf-animation',
                    uuid: subUuid,
                    displayName: '',
                    id: subId,
                    name: `${anim.name}.animation`,
                    userData: {
                        gltfIndex: 0,
                        wrapMode: anim.wrapMode !== undefined ? anim.wrapMode : 2,
                        speed: anim.speed !== undefined ? anim.speed : 1,
                        sample: anim.sample !== undefined ? anim.sample : 30,
                        span: {
                            from: anim.from,
                            to: anim.to
                        },
                        events: []
                    },
                    ver: '1.0.18',
                    imported: true,
                    files: ['.bin'],
                    subMetas: {}
                };

                // Entry for userData / imageOptimizer animations array
                animationEntries.push({
                    name: anim.name,
                    from: anim.from,
                    to: anim.to,
                    wrapMode: anim.wrapMode !== undefined ? anim.wrapMode : 2,
                    speed: anim.speed !== undefined ? anim.speed : 1,
                    previousId: subId
                });

                createdSubMetas.push({
                    id: subId,
                    name: anim.name,
                    uuid: subUuid,
                    span: { from: anim.from, to: anim.to }
                });
            }

            // Sync into userData
            if (metaContent.userData.imageOptimizer && Array.isArray(metaContent.userData.imageOptimizer)) {
                if (metaContent.userData.imageOptimizer.length > 0) {
                    metaContent.userData.imageOptimizer[0].animations = animationEntries;
                }
            } else if (metaContent.userData.animations) {
                metaContent.userData.animations = animationEntries;
            }

            fs.writeFileSync(metaFilePath, JSON.stringify(metaContent, null, 2), 'utf-8');

            // Refresh asset in editor if available
            if (typeof Editor !== 'undefined' && Editor.Message) {
                try {
                    const cleanUrl = fbxMetaPath.replace(/\.meta$/, '');
                    await Editor.Message.request('asset-db', 'refresh-asset', cleanUrl);
                } catch {}
            }

            return {
                success: true,
                message: `Successfully sliced ${animations.length} animation takes into ${path.basename(metaFilePath)}`,
                data: {
                    metaPath: metaFilePath,
                    totalSlices: animations.length,
                    slices: createdSubMetas
                }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to slice FBX animations: ${err.message}` };
        }
    }
}
