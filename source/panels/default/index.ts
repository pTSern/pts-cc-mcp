/* eslint-disable vue/one-component-per-file */

import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent, ref, computed, onMounted, watch } from 'vue';
import { EXTENSION_NAME } from '../../constants';
import { enDict, zhDict } from '../../utils/i18n';

const panelDataMap = new WeakMap<any, App>();

// Tool configuration interface
interface ToolConfig {
    category: string;
    name: string;
    enabled: boolean;
    description: string;
    inputSchema?: any;
}

export interface ToolPropertyDef {
    name: string;
    type: string;
    description: string;
    required: boolean;
    enum?: string[];
    default?: any;
    placeholder?: string;
}

export interface TestModalState {
    visible: boolean;
    mode: 'default' | 'manual';
    tool: ToolConfig | null;
    properties: ToolPropertyDef[];
    params: Record<string, any>;
    isRunning: boolean;
    result: any | null;
    error: string | null;
    execTime: number | null;
}

// Server settings interface
interface ServerSettings {
    port: number;
    autoStart: boolean;
    debugLog: boolean;
    maxConnections: number;
}

function parseToolProperties(inputSchema: any): ToolPropertyDef[] {
    if (!inputSchema) return [];
    let schema = inputSchema;
    if (typeof schema === 'string') {
        try {
            schema = JSON.parse(schema);
        } catch {
            return [];
        }
    }
    const propertiesObj = schema.properties || {};
    const requiredList = Array.isArray(schema.required) ? schema.required : [];
    const result: ToolPropertyDef[] = [];

    for (const [key, prop] of Object.entries<any>(propertiesObj)) {
        if (!prop) continue;
        const type = prop.type || (Array.isArray(prop.enum) ? 'string' : 'string');
        const enumValues = Array.isArray(prop.enum) ? prop.enum : undefined;
        let placeholder = '';
        if (type === 'string') {
            if (key.toLowerCase().includes('path')) placeholder = 'e.g. db://assets/Scene/main.scene';
            else if (key.toLowerCase().includes('uuid')) placeholder = 'e.g. root or node-uuid';
            else placeholder = prop.description ? prop.description.slice(0, 40) : '';
        } else if (type === 'number') {
            placeholder = '0';
        } else if (type === 'object') {
            placeholder = '{}';
        } else if (type === 'array') {
            placeholder = '[]';
        }

        result.push({
            name: key,
            type: type,
            description: prop.description || key,
            required: requiredList.includes(key),
            enum: enumValues,
            default: prop.default,
            placeholder: placeholder
        });
    }

    result.sort((a, b) => {
        if (a.name === 'action') return -1;
        if (b.name === 'action') return 1;
        if (a.required && !b.required) return -1;
        if (!a.required && b.required) return 1;
        return a.name.localeCompare(b.name);
    });

    return result;
}

function createDefaultParams(properties: ToolPropertyDef[]): Record<string, any> {
    const params: Record<string, any> = {};
    for (const prop of properties) {
        if (prop.default !== undefined) {
            params[prop.name] = prop.default;
        } else if (prop.enum && prop.enum.length > 0) {
            params[prop.name] = prop.enum[0];
        } else if (prop.type === 'boolean') {
            params[prop.name] = false;
        } else if (prop.type === 'number') {
            params[prop.name] = 0;
        } else if (prop.type === 'object') {
            params[prop.name] = '';
        } else if (prop.type === 'array') {
            params[prop.name] = '';
        } else {
            if (prop.name === 'action') {
                params[prop.name] = 'get';
            } else if (prop.name.toLowerCase().includes('path')) {
                params[prop.name] = 'db://assets/Scene/main.scene';
            } else if (prop.name.toLowerCase().includes('uuid')) {
                params[prop.name] = '';
            } else {
                params[prop.name] = '';
            }
        }
    }
    return params;
}

function prepareCallArgs(properties: ToolPropertyDef[], rawParams: Record<string, any>): Record<string, any> {
    const cleanArgs: Record<string, any> = {};
    for (const prop of properties) {
        const val = rawParams[prop.name];
        if (val === undefined || val === null || val === '') {
            if (prop.required && prop.type === 'boolean') {
                cleanArgs[prop.name] = false;
            }
            continue;
        }

        if (prop.type === 'number') {
            cleanArgs[prop.name] = Number(val);
        } else if (prop.type === 'boolean') {
            cleanArgs[prop.name] = Boolean(val);
        } else if (prop.type === 'object' || prop.type === 'array') {
            if (typeof val === 'string') {
                try {
                    cleanArgs[prop.name] = JSON.parse(val);
                } catch {
                    cleanArgs[prop.name] = val;
                }
            } else {
                cleanArgs[prop.name] = val;
            }
        } else {
            cleanArgs[prop.name] = val;
        }
    }
    return cleanArgs;
}

module.exports = Editor.Panel.define({
    listeners: {
        show() { 
            console.log('[pTS MCP Panel] Panel shown'); 
        },
        hide() { 
            console.log('[pTS MCP Panel] Panel hidden'); 
        },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
        panelTitle: '#panelTitle',
    },
    ready() {
        if (this.$.app) {
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            
            // Main application component
            app.component('McpServerApp', defineComponent({
                setup() {
                    // ==================== i18n System ====================
                    const translations: Record<string, Record<string, string>> = {
                        en: enDict,
                        zh: zhDict
                    };

                    // Language state - English default
                    const currentLanguage = ref(
                        (typeof localStorage !== 'undefined' && localStorage.getItem('pts-mcp-language')) || 'en'
                    );

                    const t = (key: string): string => {
                        const dict = translations[currentLanguage.value] || translations['en'] || {};
                        return dict[key] || key;
                    };

                    const switchLanguage = (lang: string) => {
                        currentLanguage.value = lang;
                        if (typeof localStorage !== 'undefined') {
                            localStorage.setItem('pts-mcp-language', lang);
                        }
                    };

                    // ==================== Reactive State ====================
                    const activeTab = ref('server');
                    const serverRunning = ref(false);
                    const connectedClients = ref(0);
                    const httpUrl = ref('');
                    const isProcessing = ref(false);
                    const copySuccess = ref(false);
                    const pingStatus = ref<string | null>(null);
                    const searchQuery = ref('');

                    const settings = ref<ServerSettings>({
                        port: 3121,
                        autoStart: false,
                        debugLog: false,
                        maxConnections: 10
                    });

                    const availableTools = ref<ToolConfig[]>([]);
                    const toolCategories = ref<string[]>([]);
                    const settingsChanged = ref(false);

                    // Computed properties
                    const statusClass = computed(() => ({
                        'status-running': serverRunning.value,
                        'status-stopped': !serverRunning.value
                    }));
                    
                    const totalTools = computed(() => availableTools.value.length);
                    const enabledTools = computed(() => availableTools.value.filter(t => t.enabled).length);
                    const disabledTools = computed(() => totalTools.value - enabledTools.value);

                    const filteredTotalCount = computed(() => {
                        if (!searchQuery.value || !searchQuery.value.trim()) {
                            return availableTools.value.length;
                        }
                        const q = searchQuery.value.trim().toLowerCase();
                        return availableTools.value.filter(t =>
                            t.name.toLowerCase().includes(q) ||
                            (t.description && t.description.toLowerCase().includes(q))
                        ).length;
                    });

                    // Methods
                    const switchTab = (tabName: string) => {
                        activeTab.value = tabName;
                        if (tabName === 'tools') {
                            loadToolManagerState();
                        }
                    };
                    
                    const toggleServer = async () => {
                        if (isProcessing.value) return;
                        isProcessing.value = true;
                        try {
                            if (serverRunning.value) {
                                await Editor.Message.request(EXTENSION_NAME, 'stop-server');
                            } else {
                                const currentSettings = {
                                    port: settings.value.port,
                                    autoStart: settings.value.autoStart,
                                    enableDebugLog: settings.value.debugLog,
                                    maxConnections: settings.value.maxConnections
                                };
                                await Editor.Message.request(EXTENSION_NAME, 'update-settings', currentSettings);
                                await Editor.Message.request(EXTENSION_NAME, 'start-server');
                            }
                            console.log('[Vue App] Server toggled');
                        } catch (error) {
                            console.error('[Vue App] Failed to toggle server:', error);
                        } finally {
                            isProcessing.value = false;
                        }
                    };

                    const testHealth = async () => {
                        pingStatus.value = '...';
                        try {
                            const port = settings.value.port || 3121;
                            const res = await fetch(`http://127.0.0.1:${port}/health`);
                            if (res.ok) {
                                const data = await res.json();
                                pingStatus.value = `OK (${data.tools || 0} tools)`;
                            } else {
                                pingStatus.value = `HTTP ${res.status}`;
                            }
                        } catch (e) {
                            pingStatus.value = 'Offline';
                        }
                        setTimeout(() => {
                            pingStatus.value = null;
                        }, 3000);
                    };
                    
                    const saveSettings = async () => {
                        try {
                            const settingsData = {
                                port: settings.value.port,
                                autoStart: settings.value.autoStart,
                                debugLog: settings.value.debugLog,
                                maxConnections: settings.value.maxConnections
                            };
                            
                            const result = await Editor.Message.request(EXTENSION_NAME, 'update-settings', settingsData);
                            console.log('[Vue App] Save settings result:', result);
                            settingsChanged.value = false;
                        } catch (error) {
                            console.error('[Vue App] Failed to save settings:', error);
                        }
                    };
                    
                    const copyUrl = async () => {
                        try {
                            const target = httpUrl.value || `http://127.0.0.1:${settings.value.port}/mcp`;
                            await navigator.clipboard.writeText(target);
                            copySuccess.value = true;
                            setTimeout(() => { copySuccess.value = false; }, 2000);
                        } catch (error) {
                            console.error('[Vue App] Failed to copy URL:', error);
                        }
                    };
                    
                    const loadToolManagerState = async () => {
                        try {
                            const result = await Editor.Message.request(EXTENSION_NAME, 'getToolManagerState');
                            if (result && result.success) {
                                availableTools.value = result.availableTools || [];
                                const categories = new Set(availableTools.value.map(tool => tool.category));
                                toolCategories.value = Array.from(categories);
                            }
                        } catch (error) {
                            console.error('[Vue App] Failed to load tool manager state:', error);
                        }
                    };
                    
                    const updateToolStatus = async (category: string, name: string, enabled: boolean) => {
                        try {
                            const toolIndex = availableTools.value.findIndex(t => t.category === category && t.name === name);
                            if (toolIndex !== -1) {
                                availableTools.value[toolIndex].enabled = enabled;
                                availableTools.value = [...availableTools.value];
                            }
                            
                            const result = await Editor.Message.request(EXTENSION_NAME, 'updateToolStatus', category, name, enabled);
                            if (!result || !result.success) {
                                if (toolIndex !== -1) {
                                    availableTools.value[toolIndex].enabled = !enabled;
                                    availableTools.value = [...availableTools.value];
                                }
                            }
                        } catch (error) {
                            const toolIndex = availableTools.value.findIndex(t => t.category === category && t.name === name);
                            if (toolIndex !== -1) {
                                availableTools.value[toolIndex].enabled = !enabled;
                                availableTools.value = [...availableTools.value];
                            }
                            console.error('[Vue App] Failed to update tool status:', error);
                        }
                    };
                    
                    const selectAllTools = async () => {
                        try {
                            availableTools.value.forEach(tool => tool.enabled = true);
                            await saveChanges();
                        } catch (error) {
                            console.error('[Vue App] Failed to select all tools:', error);
                        }
                    };
                    
                    const deselectAllTools = async () => {
                        try {
                            availableTools.value.forEach(tool => tool.enabled = false);
                            await saveChanges();
                        } catch (error) {
                            console.error('[Vue App] Failed to deselect all tools:', error);
                        }
                    };
                    
                    const saveChanges = async () => {
                        try {
                            const updates = availableTools.value.map(tool => ({
                                category: String(tool.category),
                                name: String(tool.name),
                                enabled: Boolean(tool.enabled)
                            }));
                            
                            await Editor.Message.request(EXTENSION_NAME, 'updateToolStatusBatch', updates);
                        } catch (error) {
                            console.error('[Vue App] Failed to save tool changes:', error);
                        }
                    };
                    
                    const toggleCategoryTools = async (category: string, enabled: boolean) => {
                        try {
                            availableTools.value.forEach(tool => {
                                if (tool.category === category) {
                                    tool.enabled = enabled;
                                }
                            });
                            await saveChanges();
                        } catch (error) {
                            console.error('[Vue App] Failed to toggle category tools:', error);
                        }
                    };
                    
                    const getToolsByCategory = (category: string) => {
                        let tools = availableTools.value.filter(tool => tool.category === category);
                        if (searchQuery.value && searchQuery.value.trim()) {
                            const q = searchQuery.value.trim().toLowerCase();
                            tools = tools.filter(t =>
                                t.name.toLowerCase().includes(q) ||
                                (t.description && t.description.toLowerCase().includes(q))
                            );
                        }
                        return tools;
                    };

                    const getCategoryToolCount = (category: string) => {
                        return availableTools.value.filter(tool => tool.category === category).length;
                    };

                    const getCategoryEnabledCount = (category: string) => {
                        return availableTools.value.filter(tool => tool.category === category && tool.enabled).length;
                    };
                    
                    const getCategoryDisplayName = (category: string): string => {
                        return t('cat_' + category);
                    };

                    watch(settings, () => {
                        settingsChanged.value = true;
                    }, { deep: true });

                    onMounted(async () => {
                        await loadToolManagerState();
                        
                        try {
                            const serverStatus = await Editor.Message.request(EXTENSION_NAME, 'get-server-status');
                            if (serverStatus && serverStatus.settings) {
                                settings.value = {
                                    port: serverStatus.settings.port || 3121,
                                    autoStart: serverStatus.settings.autoStart || false,
                                    debugLog: serverStatus.settings.enableDebugLog || false,
                                    maxConnections: serverStatus.settings.maxConnections || 10
                                };
                            } else if (serverStatus && serverStatus.port) {
                                settings.value.port = serverStatus.port;
                            }
                        } catch (error) {
                            console.error('[Vue App] Failed to get server status:', error);
                        }
                        
                        setInterval(async () => {
                            try {
                                const result = await Editor.Message.request(EXTENSION_NAME, 'get-server-status');
                                if (result) {
                                    serverRunning.value = result.running;
                                    connectedClients.value = result.clients || 0;
                                    httpUrl.value = result.running ? `http://127.0.0.1:${result.port}/mcp` : '';
                                }
                            } catch (error) {
                                // Silent retry
                            }
                        }, 2000);
                    });
                    
                    // ==================== Test Modal State ====================
                    const testModal = ref<TestModalState>({
                        visible: false,
                        mode: 'default',
                        tool: null,
                        properties: [],
                        params: {},
                        isRunning: false,
                        result: null,
                        error: null,
                        execTime: null
                    });

                    const openTestModal = (tool: ToolConfig) => {
                        const properties = parseToolProperties(tool.inputSchema);
                        const params = createDefaultParams(properties);

                        testModal.value = {
                            visible: true,
                            mode: 'default',
                            tool: tool,
                            properties: properties,
                            params: params,
                            isRunning: false,
                            result: null,
                            error: null,
                            execTime: null
                        };
                    };

                    const closeTestModal = () => {
                        testModal.value.visible = false;
                        testModal.value.tool = null;
                        testModal.value.result = null;
                        testModal.value.error = null;
                    };

                    const switchToManualMode = () => {
                        testModal.value.mode = 'manual';
                    };

                    const switchToDefaultMode = () => {
                        testModal.value.mode = 'default';
                    };

                    const runQuickTest = async () => {
                        if (!testModal.value.tool) return;
                        const tool = testModal.value.tool;
                        testModal.value.isRunning = true;
                        testModal.value.result = null;
                        testModal.value.error = null;
                        testModal.value.execTime = null;

                        const startTime = Date.now();
                        try {
                            const cleanArgs = prepareCallArgs(testModal.value.properties, testModal.value.params);
                            console.log(`[TestModal] Quick executing: ${tool.name}`, cleanArgs);
                            const res = await Editor.Message.request(EXTENSION_NAME, 'executeTool', tool.name, cleanArgs, tool.category);
                            testModal.value.execTime = Date.now() - startTime;
                            testModal.value.result = res;
                        } catch (err: any) {
                            testModal.value.execTime = Date.now() - startTime;
                            testModal.value.error = err?.message || String(err);
                            console.error(`[TestModal] Execution failed:`, err);
                        } finally {
                            testModal.value.isRunning = false;
                        }
                    };

                    const invokeManualTool = async () => {
                        if (!testModal.value.tool) return;
                        const tool = testModal.value.tool;
                        testModal.value.isRunning = true;
                        testModal.value.result = null;
                        testModal.value.error = null;
                        testModal.value.execTime = null;

                        const startTime = Date.now();
                        try {
                            const cleanArgs = prepareCallArgs(testModal.value.properties, testModal.value.params);
                            console.log(`[TestModal] Manual invoking: ${tool.name}`, cleanArgs);
                            const res = await Editor.Message.request(EXTENSION_NAME, 'executeTool', tool.name, cleanArgs, tool.category);
                            testModal.value.execTime = Date.now() - startTime;
                            testModal.value.result = res;
                        } catch (err: any) {
                            testModal.value.execTime = Date.now() - startTime;
                            testModal.value.error = err?.message || String(err);
                            console.error(`[TestModal] Manual execution failed:`, err);
                        } finally {
                            testModal.value.isRunning = false;
                        }
                    };

                    const formatResult = (val: any): string => {
                        if (val === null || val === undefined) return '';
                        if (typeof val === 'string') return val;
                        try {
                            return JSON.stringify(val, null, 2);
                        } catch {
                            return String(val);
                        }
                    };

                    return {
                        // i18n
                        currentLanguage,
                        t,
                        switchLanguage,

                        // Data
                        activeTab,
                        serverRunning,
                        connectedClients,
                        httpUrl,
                        isProcessing,
                        copySuccess,
                        pingStatus,
                        searchQuery,
                        settings,
                        availableTools,
                        toolCategories,
                        settingsChanged,
                        testModal,

                        // Computed
                        statusClass,
                        totalTools,
                        enabledTools,
                        disabledTools,
                        filteredTotalCount,

                        // Methods
                        switchTab,
                        toggleServer,
                        testHealth,
                        saveSettings,
                        copyUrl,
                        loadToolManagerState,
                        updateToolStatus,
                        selectAllTools,
                        deselectAllTools,
                        saveChanges,
                        toggleCategoryTools,
                        getToolsByCategory,
                        getCategoryToolCount,
                        getCategoryEnabledCount,
                        getCategoryDisplayName,

                        // Tester Methods
                        openTestModal,
                        closeTestModal,
                        switchToManualMode,
                        switchToDefaultMode,
                        runQuickTest,
                        invokeManualTool,
                        formatResult
                    };
                },
                template: readFileSync(join(__dirname, '../../../static/template/vue/mcp-server-app.html'), 'utf-8'),
            }));
            
            app.mount(this.$.app);
            panelDataMap.set(this, app);
            
            console.log('[pTS MCP Panel] Vue3 app mounted successfully');
        }
    },
    beforeClose() { },
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
        }
    },
});