import * as path from 'path';

let enDict: Record<string, string> = {};
let zhDict: Record<string, string> = {};

try {
    // Relative to dist/utils or source/utils
    enDict = require('../../i18n/en');
    zhDict = require('../../i18n/zh');
} catch (e) {
    try {
        const rootPath = path.resolve(__dirname, '../../i18n');
        enDict = require(path.join(rootPath, 'en'));
        zhDict = require(path.join(rootPath, 'zh'));
    } catch (e2) {
        console.warn('[pTS-MCP] Failed to load local i18n dictionaries:', e2);
    }
}

/**
 * Translate key with fallback to local English dictionary and parameter interpolation.
 * Supports {0}, {1} or {key} replacement.
 */
export function t(key: string, args?: any[] | Record<string, any>): string {
    let text = '';
    if (typeof Editor !== 'undefined' && (Editor as any).I18n && typeof (Editor as any).I18n.t === 'function') {
        const res = (Editor as any).I18n.t(`pts-cc-mcp.${key}`);
        if (res && res !== `pts-cc-mcp.${key}`) {
            text = res;
        }
    }
    if (!text) {
        text = enDict[key] || key;
    }
    if (args) {
        if (Array.isArray(args)) {
            args.forEach((val, i) => {
                text = text.replace(new RegExp(`\\{${i}\\}`, 'g'), String(val));
            });
        } else {
            for (const [k, v] of Object.entries(args)) {
                text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
            }
        }
    }
    return text;
}

export { enDict, zhDict };
