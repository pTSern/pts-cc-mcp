import * as path from 'path';
import * as fs from 'fs';

declare const Editor: any;

export interface ResolvedAsset {
    uuid: string;
    url?: string;
    path?: string;
    type?: string;
    subAssets?: {
        spriteFrame?: { uuid: string; type: string };
        texture?: { uuid: string; type: string };
    };
    resolvedUuid?: string;
}

export class AssetResolver {
    /**
     * Resolves an asset path, pattern, or raw UUID into a resolved asset structure.
     * Handles sub-assets like @spriteFrame (@f9941) and @texture (@6c48a).
     */
    public static async resolve(
        pathOrPatternOrUuid: string,
        targetSubType?: 'spriteFrame' | 'texture' | 'raw'
    ): Promise<ResolvedAsset | null> {
        if (!pathOrPatternOrUuid || typeof pathOrPatternOrUuid !== 'string') {
            return null;
        }

        let input = pathOrPatternOrUuid.trim();
        let explicitSubType: 'spriteFrame' | 'texture' | null = null;

        // Detect explicit sub-asset suffixes in input
        if (input.endsWith('@spriteFrame')) {
            explicitSubType = 'spriteFrame';
            input = input.substring(0, input.length - '@spriteFrame'.length);
        } else if (input.endsWith('@texture') || input.endsWith('@texture2D')) {
            explicitSubType = 'texture';
            input = input.substring(0, input.lastIndexOf('@'));
        }

        const effectiveSubType = explicitSubType || (targetSubType !== 'raw' ? targetSubType : null);

        // Case 1: Already has internal Cocos sub-asset UUID suffix (e.g. uuid@f9941 or uuid@6c48a)
        if (input.includes('@f9941') || input.includes('@6c48a')) {
            const [baseUuid] = input.split('@');
            return {
                uuid: baseUuid,
                resolvedUuid: input,
                subAssets: {
                    spriteFrame: { uuid: `${baseUuid}@f9941`, type: 'cc.SpriteFrame' },
                    texture: { uuid: `${baseUuid}@6c48a`, type: 'cc.Texture2D' }
                }
            };
        }

        // Case 2: Standard UUID format
        const isUuidPattern = /^[0-9a-fA-F-]{16,}$/.test(input);
        if (isUuidPattern) {
            const baseUuid = input;
            let resolvedUuid = baseUuid;
            if (effectiveSubType === 'spriteFrame') {
                resolvedUuid = `${baseUuid}@f9941`;
            } else if (effectiveSubType === 'texture') {
                resolvedUuid = `${baseUuid}@6c48a`;
            }

            let assetUrl: string | undefined;
            if (typeof Editor !== 'undefined' && Editor.Message) {
                try {
                    assetUrl = (await Editor.Message.request('asset-db', 'query-url', baseUuid)) || undefined;
                } catch {}
            }

            return {
                uuid: baseUuid,
                url: assetUrl,
                resolvedUuid,
                subAssets: {
                    spriteFrame: { uuid: `${baseUuid}@f9941`, type: 'cc.SpriteFrame' },
                    texture: { uuid: `${baseUuid}@6c48a`, type: 'cc.Texture2D' }
                }
            };
        }

        // Case 3: URL or Path
        let assetUrl = input;
        if (!assetUrl.startsWith('db://')) {
            // Normalize relative path
            const cleanPath = assetUrl.replace(/^\.?[\/\\]+/, '').replace(/\\/g, '/');
            if (cleanPath.startsWith('assets/')) {
                assetUrl = `db://${cleanPath}`;
            } else {
                assetUrl = `db://assets/${cleanPath}`;
            }
        }

        // Query asset info from Cocos Creator Asset DB
        if (typeof Editor !== 'undefined' && Editor.Message) {
            try {
                let assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', assetUrl);

                // If not found directly, try searching by pattern/filename
                if (!assetInfo) {
                    const baseName = path.basename(input);
                    const matchedAssets: any[] = await Editor.Message.request('asset-db', 'query-assets', {
                        pattern: baseName
                    });
                    if (matchedAssets && matchedAssets.length > 0) {
                        assetInfo = matchedAssets[0];
                    }
                }

                if (assetInfo && assetInfo.uuid) {
                    const baseUuid = assetInfo.uuid;
                    let resolvedUuid = baseUuid;

                    const isImage =
                        assetInfo.type === 'cc.ImageAsset' ||
                        /\.(png|jpg|jpeg|webp|tga|bmp)$/i.test(assetInfo.file || assetInfo.url || input);

                    if (isImage) {
                        if (effectiveSubType === 'spriteFrame') {
                            resolvedUuid = `${baseUuid}@f9941`;
                        } else if (effectiveSubType === 'texture') {
                            resolvedUuid = `${baseUuid}@6c48a`;
                        }
                    }

                    return {
                        uuid: baseUuid,
                        url: assetInfo.url,
                        path: assetInfo.file,
                        type: assetInfo.type,
                        resolvedUuid,
                        subAssets: isImage
                            ? {
                                  spriteFrame: { uuid: `${baseUuid}@f9941`, type: 'cc.SpriteFrame' },
                                  texture: { uuid: `${baseUuid}@6c48a`, type: 'cc.Texture2D' }
                              }
                            : undefined
                    };
                }
            } catch (err) {
                console.warn('[AssetResolver] Asset DB query error for', input, err);
            }
        }

        return null;
    }

    /**
     * Deeply scans an object or array and resolves any asset paths (db://...) or @spriteFrame / @texture
     * references to their respective UUIDs.
     */
    public static async resolvePropertiesDeep(data: any): Promise<any> {
        if (!data || typeof data !== 'object') {
            return data;
        }

        if (Array.isArray(data)) {
            const resolvedArray = [];
            for (const item of data) {
                resolvedArray.push(await this.resolvePropertiesDeep(item));
            }
            return resolvedArray;
        }

        const resolvedObj: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                const isSpriteKey =
                    /spriteFrame/i.test(key) ||
                    value.includes('@spriteFrame') ||
                    value.endsWith('@f9941');
                const isTextureKey =
                    /texture/i.test(key) ||
                    value.includes('@texture') ||
                    value.endsWith('@6c48a');

                if (value.startsWith('db://') || value.includes('@spriteFrame') || value.includes('@texture')) {
                    const subType = isSpriteKey ? 'spriteFrame' : isTextureKey ? 'texture' : undefined;
                    const resolved = await this.resolve(value, subType);
                    if (resolved && resolved.resolvedUuid) {
                        resolvedObj[key] = isSpriteKey || isTextureKey
                            ? resolved.resolvedUuid
                            : resolved.uuid;
                        continue;
                    }
                }

                // If key expects spriteFrame and value is raw Image UUID, append @f9941
                if (isSpriteKey && /^[0-9a-fA-F-]{16,}$/.test(value) && !value.includes('@')) {
                    resolvedObj[key] = `${value}@f9941`;
                    continue;
                }

                resolvedObj[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                const valObj = value as any;
                // If it's an object with __uuid__ referencing a path, resolve it
                if (typeof valObj.__uuid__ === 'string' && valObj.__uuid__.startsWith('db://')) {
                    const resolved = await this.resolve(valObj.__uuid__);
                    if (resolved) {
                        resolvedObj[key] = {
                            ...value,
                            __uuid__: resolved.resolvedUuid || resolved.uuid
                        };
                        continue;
                    }
                }
                resolvedObj[key] = await this.resolvePropertiesDeep(value);
            } else {
                resolvedObj[key] = value;
            }
        }

        return resolvedObj;
    }
}
