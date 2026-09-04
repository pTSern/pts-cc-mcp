'use strict';

/**
 * Cocos Creator Scene Process Bridge
 * Runs inside the Engine Scene execution context where \cc\ and \cce\ are globally available.
 */

function findNodeByUuid(uuid) {
    if (!uuid) return null;
    const scene = cc.director.getScene();
    if (!scene) return null;

    if (scene.uuid === uuid || scene._id === uuid) return scene;

    function search(node) {
        if (!node) return null;
        if (node.uuid === uuid || node._id === uuid) return node;
        if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
                const found = search(node.children[i]);
                if (found) return found;
            }
        }
        return null;
    }

    return search(scene);
}

function findComponent(node, componentType) {
    if (!node || !node.components) return null;

    const ctor = cc.js.getClassByName(componentType);
    if (ctor) {
        const comp = node.getComponent(ctor);
        if (comp) return comp;
    }

    for (let i = 0; i < node.components.length; i++) {
        const comp = node.components[i];
        if (!comp) continue;
        const compCtor = comp.constructor;
        const compName = compCtor ? compCtor.name : '';
        const compClassName = compCtor ? cc.js.getClassName(compCtor) : '';
        const compCid = compCtor ? cc.js._getClassId(compCtor) : '';
        const typeStr = comp.__type__ || '';

        if (
            compName === componentType ||
            compClassName === componentType ||
            compCid === componentType ||
            typeStr === componentType ||
            (comp.uuid && comp.uuid === componentType)
        ) {
            return comp;
        }
    }

    if (/^\d+$/.test(componentType)) {
        const idx = parseInt(componentType, 10);
        if (idx >= 0 && idx < node.components.length) {
            return node.components[idx];
        }
    }

    return null;
}

function getCCClassAttrs(target) {
    if (!target) return {};
    const ctor = typeof target === 'function' ? target : target.constructor;
    if (!ctor) return {};

    const attrs = cc.Class.Attr.getClassAttrs(ctor) || {};
    const delimiter = cc.Class.Attr.DELIMETER || '$';
    const result = {};

    for (const key in attrs) {
        const parts = key.split(delimiter);
        const propName = parts[0];
        const attrKey = parts[1];
        if (!result[propName]) result[propName] = {};
        result[propName][attrKey] = attrs[key];
    }

    return {
        className: cc.js.getClassName(ctor) || ctor.name,
        props: ctor.__props__ || (ctor.prototype ? ctor.prototype.__props__ : []) || [],
        attributes: result
    };
}

async function resolveAssetValue(val, expectedType) {
    if (val === null || val === undefined) return null;
    if (val instanceof cc.Asset) return val;

    let uuid = '';
    if (typeof val === 'string') {
        uuid = val;
    } else if (typeof val === 'object') {
        if (val.__uuid__) uuid = val.__uuid__;
        else if (val.uuid) uuid = val.uuid;
    }

    if (!uuid) return val;

    return new Promise((resolve) => {
        try {
            cc.assetManager.loadAny({ uuid: uuid }, (err, asset) => {
                if (!err && asset) {
                    resolve(asset);
                } else {
                    const expectedName = expectedType ? (cc.js.getClassName(expectedType) || expectedType.name || expectedType) : undefined;
                    resolve({ __uuid__: uuid, __expectedType__: expectedName });
                }
            });
        } catch (e) {
            resolve({ __uuid__: uuid });
        }
    });
}

async function setDeepProperty(target, pathStr, value) {
    if (!target) return false;

    const parts = pathStr.split('.');
    let current = target;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        let next = current[part];

        if (next === null || next === undefined) {
            const attrsInfo = getCCClassAttrs(current);
            const propAttr = attrsInfo.attributes ? attrsInfo.attributes[part] : null;

            if (propAttr && propAttr.ctor && typeof propAttr.ctor === 'function') {
                current[part] = new propAttr.ctor();
            } else if (propAttr && propAttr.type && typeof propAttr.type === 'function') {
                current[part] = new propAttr.type();
            } else if (!isNaN(Number(parts[i + 1]))) {
                current[part] = [];
            } else {
                current[part] = {};
            }
            next = current[part];
        }
        current = next;
    }

    const lastPart = parts[parts.length - 1];
    const targetAttrsInfo = getCCClassAttrs(current);
    const lastAttr = targetAttrsInfo.attributes ? targetAttrsInfo.attributes[lastPart] : null;

    if (lastAttr) {
        const attrCtor = lastAttr.ctor || (typeof lastAttr.type === 'function' ? lastAttr.type : null);
        const attrType = lastAttr.type;
        const isAssetType = (
            (attrCtor && cc.js.isChildClassOf(attrCtor, cc.Asset)) ||
            attrCtor === cc.Asset ||
            attrCtor === cc.JsonAsset ||
            attrType === cc.Asset ||
            attrType === cc.JsonAsset ||
            attrType === cc.SpriteFrame ||
            attrType === cc.Texture2D ||
            attrType === cc.Material ||
            attrType === cc.AudioClip ||
            attrType === cc.Prefab ||
            (typeof value === 'string' && (value.includes('-') || value.includes('@'))) ||
            (value && (value.__uuid__ || value.uuid))
        );

        if (Array.isArray(value)) {
            const isArrayOfAssets = Array.isArray(attrType) && (
                cc.js.isChildClassOf(attrType[0], cc.Asset) ||
                attrType[0] === cc.Asset ||
                attrType[0] === cc.JsonAsset
            );

            if (isArrayOfAssets || isAssetType) {
                const resolvedArray = [];
                for (const item of value) {
                    const resolved = await resolveAssetValue(item, attrCtor || attrType);
                    resolvedArray.push(resolved);
                }
                current[lastPart] = resolvedArray;
                return true;
            }
        } else if (isAssetType && (typeof value === 'string' || (value && value.__uuid__))) {
            current[lastPart] = await resolveAssetValue(value, attrCtor || attrType);
            return true;
        }
    }

    if (Array.isArray(value)) {
        current[lastPart] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && typeof current[lastPart] === 'object' && current[lastPart] !== null) {
        for (const [k, v] of Object.entries(value)) {
            await setDeepProperty(current[lastPart], k, v);
        }
    } else {
        current[lastPart] = value;
    }

    return true;
}

exports.load = function() {
    console.log('[cocos-mcp-server] _cc scene script loaded');
};

exports.unload = function() {
    console.log('[cocos-mcp-server] _cc scene script unloaded');
};

exports.methods = {
    log(...args) {
        cc.log('[cocos-mcp-server:_cc]', ...args);
        return { success: true };
    },

    getClassInfo(className) {
        try {
            const ctor = cc[className] || cc.js.getClassByName(className);
            if (!ctor || typeof ctor !== 'function') {
                return { success: false, error: 'Class not found: ' + className };
            }
            const info = getCCClassAttrs(ctor);
            return { success: true, data: info };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getComponentInfo(nodeUuid, componentType) {
        try {
            const node = findNodeByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: 'Node not found: ' + nodeUuid };
            }
            const comp = findComponent(node, componentType);
            if (!comp) {
                return { success: false, error: 'Component not found: ' + componentType };
            }
            const classInfo = getCCClassAttrs(comp.constructor);
            const props = {};
            for (const p of classInfo.props) {
                props[p] = comp[p];
            }
            return {
                success: true,
                data: {
                    className: classInfo.className,
                    enabled: comp.enabled,
                    props: props,
                    attributes: classInfo.attributes
                }
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async updateComponent(nodeUuid, componentType, properties) {
        try {
            const node = findNodeByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: 'Node not found: ' + nodeUuid };
            }

            let comp = findComponent(node, componentType);
            if (!comp) {
                const ctor = cc.js.getClassByName(componentType);
                if (ctor) {
                    comp = node.addComponent(ctor);
                } else {
                    return { success: false, error: 'Component ' + componentType + ' not found on node and cannot be added' };
                }
            }

            const updatedKeys = [];
            for (const [propPath, val] of Object.entries(properties)) {
                await setDeepProperty(comp, propPath, val);
                updatedKeys.push(propPath);
            }

            try {
                if (typeof cce !== 'undefined' && cce.Node) {
                    cce.Node.emit('change', node);
                }
                if (typeof Editor !== 'undefined' && Editor.Message) {
                    Editor.Message.send('scene', 'snapshot');
                }
            } catch (notifyErr) {
                console.warn('[cocos-mcp-server] Notification error:', notifyErr);
            }

            return {
                success: true,
                message: 'Successfully updated ' + updatedKeys.length + ' properties on ' + (comp.constructor.name || componentType),
                data: {
                    nodeUuid: node.uuid || node._id,
                    componentType: comp.constructor.name || componentType,
                    updatedProperties: updatedKeys
                }
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    setNodeProperty(nodeUuid, path, value) {
        try {
            const node = findNodeByUuid(nodeUuid);
            if (!node) return { success: false, error: 'Node not found: ' + nodeUuid };

            if (path === 'active') node.active = value;
            else if (path === 'name') node.name = value;
            else if (path === 'position') node.setPosition(value.x || 0, value.y || 0, value.z || 0);
            else if (path === 'rotation') node.setRotationFromEuler(value.x || 0, value.y || 0, value.z || 0);
            else if (path === 'scale') node.setScale(value.x || 1, value.y || 1, value.z || 1);
            else node[path] = value;

            return { success: true, message: 'Node property ' + path + ' updated' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};
