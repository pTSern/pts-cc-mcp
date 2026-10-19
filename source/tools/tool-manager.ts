import { v4 as uuidv4 } from 'uuid';
import { ToolConfig, ToolConfiguration, ToolManagerSettings, ToolDefinition } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { isNexusAvailable } from '../utils/nexus-checker';
import { isChromiumAvailable } from '../utils/chromium-checker';
import { t } from '../utils/i18n';

export class ToolManager {
    private settings: ToolManagerSettings;
    private availableTools: ToolConfig[] = [];

    constructor() {
        this.settings = this.readToolManagerSettings();
        this.initializeAvailableTools();
        
        // If no configuration exists, automatically create a default configuration
        if (this.settings.configurations.length === 0) {
            console.log('[ToolManager] No configurations found, creating default configuration...');
            this.createConfiguration(t('default_config_name'), t('default_config_desc'));
        } else {
            this.syncAvailableToolsToConfigurations();
        }
    }

    private syncAvailableToolsToConfigurations(): void {
        let changed = false;
        const nexusActive = isNexusAvailable();
        const chromiumActive = isChromiumAvailable();
        for (const config of this.settings.configurations) {
            const existingKeys = new Set(config.tools.map(t => `${t.category}_${t.name}`));
            for (const tool of this.availableTools) {
                const key = `${tool.category}_${tool.name}`;
                if (!existingKeys.has(key)) {
                    config.tools.push({ ...tool });
                    changed = true;
                }
            }

            // Automatically disable nexus tools if pts-nexus is absent or disabled
            for (const tool of config.tools) {
                if (tool.category === 'nexus' || tool.name.startsWith('nexus_')) {
                    if (!nexusActive && tool.enabled) {
                        tool.enabled = false;
                        changed = true;
                    }
                }
                if (tool.category === 'browser' || tool.name.startsWith('browser_')) {
                    if (!chromiumActive && tool.enabled) {
                        tool.enabled = false;
                        changed = true;
                    }
                }
            }
        }
        if (changed) {
            this.saveSettings();
            console.log('[ToolManager] Synced newly available tools to existing configurations');
        }
    }

    private getToolManagerSettingsPath(): string {
        return path.join(Editor.Project.path, 'settings', 'tool-manager.json');
    }

    private ensureSettingsDir(): void {
        const settingsDir = path.dirname(this.getToolManagerSettingsPath());
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
    }

    private readToolManagerSettings(): ToolManagerSettings {
        const DEFAULT_TOOL_MANAGER_SETTINGS: ToolManagerSettings = {
            configurations: [],
            currentConfigId: '',
            maxConfigSlots: 5
        };

        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            if (fs.existsSync(settingsFile)) {
                const content = fs.readFileSync(settingsFile, 'utf8');
                return { ...DEFAULT_TOOL_MANAGER_SETTINGS, ...JSON.parse(content) };
            }
        } catch (e) {
            console.error('Failed to read tool manager settings:', e);
        }
        return DEFAULT_TOOL_MANAGER_SETTINGS;
    }

    private saveToolManagerSettings(settings: ToolManagerSettings): void {
        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        } catch (e) {
            console.error('Failed to save tool manager settings:', e);
            throw e;
        }
    }

    private exportToolConfiguration(config: ToolConfiguration): string {
        return JSON.stringify(config, null, 2);
    }

    private importToolConfiguration(configJson: string): ToolConfiguration {
        try {
            const config = JSON.parse(configJson);
            // Validate configuration format
            if (!config.id || !config.name || !Array.isArray(config.tools)) {
                throw new Error('Invalid configuration format');
            }
            return config;
        } catch (e) {
            console.error('Failed to parse tool configuration:', e);
            throw new Error('Invalid JSON format or configuration structure');
        }
    }

    private initializeAvailableTools(): void {
        // Retrieve real tool list from MCP server
        try {
            const toolModNames = [
                './scene-tools', './node-tools', './component-tools', './prefab-tools',
                './project-tools', './debug-tools', './preferences-tools', './server-tools',
                './broadcast-tools', './scene-view-tools', './reference-image-tools',
                './asset-advanced-tools', './validation-tools', './game-tools',
                './animgraph-tools', './batch-tools', './knowledge-tools', './ui-builder-tools',
                './nexus-tools', './browser-tools'
            ];
            for (const mod of toolModNames) {
                try {
                    delete require.cache[require.resolve(mod)];
                } catch {}
            }

            // Import all tool classes
            const { SceneTools } = require('./scene-tools');
            const { NodeTools } = require('./node-tools');
            const { ComponentTools } = require('./component-tools');
            const { PrefabTools } = require('./prefab-tools');
            const { ProjectTools } = require('./project-tools');
            const { DebugTools } = require('./debug-tools');
            const { PreferencesTools } = require('./preferences-tools');
            const { ServerTools } = require('./server-tools');
            const { BroadcastTools } = require('./broadcast-tools');
            const { SceneViewTools } = require('./scene-view-tools');
            const { ReferenceImageTools } = require('./reference-image-tools');
            const { AssetAdvancedTools } = require('./asset-advanced-tools');
            const { ValidationTools } = require('./validation-tools');
            const { GameTools } = require('./game-tools');
            const { AnimgraphTools } = require('./animgraph-tools');
            const { BatchTools } = require('./batch-tools');
            const { KnowledgeTools } = require('./knowledge-tools');
            const { UIBuilderTools } = require('./ui-builder-tools');
            const { AnimationTools } = require('./animation-tools');
            const { NexusTools } = require('./nexus-tools');
            const { BrowserTools } = require('./browser-tools');

            // Initialize tool instances
            const tools = {
                scene: new SceneTools(),
                node: new NodeTools(),
                component: new ComponentTools(),
                prefab: new PrefabTools(),
                project: new ProjectTools(),
                debug: new DebugTools(),
                preferences: new PreferencesTools(),
                server: new ServerTools(),
                broadcast: new BroadcastTools(),
                sceneView: new SceneViewTools(),
                referenceImage: new ReferenceImageTools(),
                assetAdvanced: new AssetAdvancedTools(),
                validation: new ValidationTools(),
                nexus: new NexusTools(),
                browser: new BrowserTools(),
                game: new GameTools(),
                animgraph: new AnimgraphTools(),
                animation: new AnimationTools(),
                batch: new BatchTools(),
                knowledge: new KnowledgeTools(),
                uiBuilder: new UIBuilderTools()
            };

            // Get tool definitions from each tool class
            const nexusActive = isNexusAvailable();
            const chromiumActive = isChromiumAvailable();
            this.availableTools = [];
            for (const [category, toolSet] of Object.entries(tools)) {
                const toolDefinitions = toolSet.getTools();
                toolDefinitions.forEach((tool: any) => {
                    const isNexusTool = category === 'nexus' || tool.name.startsWith('nexus_');
                    const isBrowserTool = category === 'browser' || tool.name.startsWith('browser_');
                    let isEnabled = true;
                    if (isNexusTool) isEnabled = nexusActive;
                    else if (isBrowserTool) isEnabled = chromiumActive;

                    this.availableTools.push({
                        category: category,
                        name: tool.name,
                        enabled: isEnabled,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    });
                });
            }

            console.log(`[ToolManager] Initialized ${this.availableTools.length} tools from MCP server`);
        } catch (error) {
            console.error('[ToolManager] Failed to initialize tools from MCP server:', error);
            // If failed to load, fallback to default tool definitions
            this.initializeDefaultTools();
        }
    }

    private initializeDefaultTools(): void {
        // Fallback default tool list
        const toolCategories = [
            { category: 'scene', name: 'Scene Tools', tools: [
                { name: 'getCurrentSceneInfo', description: 'Get current scene info' },
                { name: 'getSceneHierarchy', description: 'Get scene hierarchy' },
                { name: 'createNewScene', description: 'Create new scene' },
                { name: 'saveScene', description: 'Save scene' },
                { name: 'loadScene', description: 'Load scene' }
            ]},
            { category: 'node', name: 'Node Tools', tools: [
                { name: 'getAllNodes', description: 'Get all nodes' },
                { name: 'findNodeByName', description: 'Find node by name' },
                { name: 'createNode', description: 'Create node' },
                { name: 'deleteNode', description: 'Delete node' },
                { name: 'setNodeProperty', description: 'Set node property' },
                { name: 'getNodeInfo', description: 'Get node info' }
            ]},
            { category: 'component', name: 'Component Tools', tools: [
                { name: 'addComponentToNode', description: 'Add component to node' },
                { name: 'removeComponentFromNode', description: 'Remove component from node' },
                { name: 'setComponentProperty', description: 'Set component property' },
                { name: 'getComponentInfo', description: 'Get component info' }
            ]},
            { category: 'prefab', name: 'Prefab Tools', tools: [
                { name: 'createPrefabFromNode', description: 'Create prefab from node' },
                { name: 'instantiatePrefab', description: 'Instantiate prefab' },
                { name: 'getPrefabInfo', description: 'Get prefab info' },
                { name: 'savePrefab', description: 'Save prefab' }
            ]},
            { category: 'project', name: 'Project Tools', tools: [
                { name: 'getProjectInfo', description: 'Get project info' },
                { name: 'getAssetList', description: 'Get asset list' },
                { name: 'createAsset', description: 'Create asset' },
                { name: 'deleteAsset', description: 'Delete asset' }
            ]},
            { category: 'debug', name: 'Debug Tools', tools: [
                { name: 'getConsoleLogs', description: 'Get console logs' },
                { name: 'getPerformanceStats', description: 'Get performance stats' },
                { name: 'validateScene', description: 'Validate scene' },
                { name: 'getErrorLogs', description: 'Get error logs' }
            ]},
            { category: 'preferences', name: 'Preferences Tools', tools: [
                { name: 'getPreferences', description: 'Get preferences' },
                { name: 'setPreferences', description: 'Set preferences' },
                { name: 'resetPreferences', description: 'Reset preferences' }
            ]},
            { category: 'server', name: 'Server Tools', tools: [
                { name: 'getServerStatus', description: 'Get server status' },
                { name: 'getConnectedClients', description: 'Get connected clients' },
                { name: 'getServerLogs', description: 'Get server logs' }
            ]},
            { category: 'broadcast', name: 'Broadcast Tools', tools: [
                { name: 'broadcastMessage', description: 'Broadcast message' },
                { name: 'getBroadcastHistory', description: 'Get broadcast history' }
            ]},
            { category: 'sceneView', name: 'Scene View Tools', tools: [
                { name: 'getViewportInfo', description: 'Get viewport info' },
                { name: 'setViewportCamera', description: 'Set viewport camera' },
                { name: 'focusOnNode', description: 'Focus on node' }
            ]},
            { category: 'referenceImage', name: 'Reference Image Tools', tools: [
                { name: 'addReferenceImage', description: 'Add reference image' },
                { name: 'removeReferenceImage', description: 'Remove reference image' },
                { name: 'getReferenceImages', description: 'Get reference image list' }
            ]},
            { category: 'assetAdvanced', name: 'Advanced Asset Tools', tools: [
                { name: 'importAsset', description: 'Import asset' },
                { name: 'exportAsset', description: 'Export asset' },
                { name: 'processAsset', description: 'Process asset' }
            ]},
            { category: 'validation', name: 'Validation Tools', tools: [
                { name: 'validateProject', description: 'Validate project' },
                { name: 'validateAssets', description: 'Validate assets' },
                { name: 'generateReport', description: 'Generate report' }
            ]}
        ];

        this.availableTools = [];
        toolCategories.forEach(category => {
            category.tools.forEach(tool => {
                this.availableTools.push({
                    category: category.category,
                    name: tool.name,
                    enabled: true, // Enabled by default
                    description: tool.description
                });
            });
        });

        console.log(`[ToolManager] Initialized ${this.availableTools.length} default tools`);
    }

    public getAvailableTools(): ToolConfig[] {
        return [...this.availableTools];
    }

    public getConfigurations(): ToolConfiguration[] {
        return [...this.settings.configurations];
    }

    public getCurrentConfiguration(): ToolConfiguration | null {
        if (!this.settings.currentConfigId) {
            return null;
        }
        return this.settings.configurations.find(config => config.id === this.settings.currentConfigId) || null;
    }

    public createConfiguration(name: string, description?: string): ToolConfiguration {
        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(t('max_config_slots_reached', [this.settings.maxConfigSlots]));
        }

        const config: ToolConfiguration = {
            id: uuidv4(),
            name,
            description,
            tools: this.availableTools.map(tool => ({ ...tool })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.settings.configurations.push(config);
        this.settings.currentConfigId = config.id;
        this.saveSettings();

        return config;
    }

    public updateConfiguration(configId: string, updates: Partial<ToolConfiguration>): ToolConfiguration {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error(t('config_not_found'));
        }

        const config = this.settings.configurations[configIndex];
        const updatedConfig: ToolConfiguration = {
            ...config,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.settings.configurations[configIndex] = updatedConfig;
        this.saveSettings();

        return updatedConfig;
    }

    public deleteConfiguration(configId: string): void {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error(t('config_not_found'));
        }

        this.settings.configurations.splice(configIndex, 1);
        
        // If current configuration is deleted, clear or fallback currentConfigId
        if (this.settings.currentConfigId === configId) {
            this.settings.currentConfigId = this.settings.configurations.length > 0 
                ? this.settings.configurations[0].id 
                : '';
        }

        this.saveSettings();
    }

    public setCurrentConfiguration(configId: string): void {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error(t('config_not_found'));
        }

        this.settings.currentConfigId = configId;
        this.saveSettings();
    }

    public updateToolStatus(configId: string, category: string, toolName: string, enabled: boolean): void {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error(t('config_not_found'));
        }

        const tool = config.tools.find(t => t.category === category && t.name === toolName);
        if (!tool) {
            throw new Error(t('tool_not_found'));
        }

        tool.enabled = enabled;
        config.updatedAt = new Date().toISOString();
        this.saveSettings();
    }

    public updateToolStatusBatch(configId: string, updates: { category: string; name: string; enabled: boolean }[]): void {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error(t('config_not_found'));
        }

        updates.forEach(update => {
            const tool = config.tools.find(t => t.category === update.category && t.name === update.name);
            if (tool) {
                tool.enabled = update.enabled;
            }
        });

        config.updatedAt = new Date().toISOString();
        this.saveSettings();
    }

    public exportConfiguration(configId: string): string {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error(t('config_not_found'));
        }

        return this.exportToolConfiguration(config);
    }

    public importConfiguration(configJson: string): ToolConfiguration {
        const config = this.importToolConfiguration(configJson);
        
        // Generate new ID and timestamps
        config.id = uuidv4();
        config.createdAt = new Date().toISOString();
        config.updatedAt = new Date().toISOString();

        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(t('max_config_slots_reached', [this.settings.maxConfigSlots]));
        }

        this.settings.configurations.push(config);
        this.saveSettings();

        return config;
    }

    public getEnabledTools(): ToolConfig[] {
        const nexusActive = isNexusAvailable();
        const chromiumActive = isChromiumAvailable();
        const currentConfig = this.getCurrentConfiguration();
        const tools = currentConfig ? currentConfig.tools : this.availableTools;
        return tools.filter(tool => {
            const isNexusTool = tool.category === 'nexus' || tool.name.startsWith('nexus_');
            if (isNexusTool && !nexusActive) {
                return false;
            }
            const isBrowserTool = tool.category === 'browser' || tool.name.startsWith('browser_');
            if (isBrowserTool && !chromiumActive) {
                return false;
            }
            return tool.enabled;
        });
    }

    public getToolManagerState() {
        const nexusActive = isNexusAvailable();
        const chromiumActive = isChromiumAvailable();
        const currentConfig = this.getCurrentConfiguration();
        const rawTools = currentConfig ? currentConfig.tools : this.getAvailableTools();
        const schemaMap = new Map(this.availableTools.map(t => [`${t.category}_${t.name}`, t.inputSchema]));

        const enrichedTools = rawTools.map(tool => {
            const isNexusTool = tool.category === 'nexus' || tool.name.startsWith('nexus_');
            const isBrowserTool = tool.category === 'browser' || tool.name.startsWith('browser_');
            let isEnabled = tool.enabled;
            if (isNexusTool) isEnabled = nexusActive && tool.enabled;
            else if (isBrowserTool) isEnabled = chromiumActive && tool.enabled;

            return {
                ...tool,
                enabled: isEnabled,
                inputSchema: tool.inputSchema || schemaMap.get(`${tool.category}_${tool.name}`) || null
            };
        });

        return {
            success: true,
            availableTools: enrichedTools,
            selectedConfigId: this.settings.currentConfigId,
            configurations: this.getConfigurations(),
            maxConfigSlots: this.settings.maxConfigSlots
        };
    }

    private saveSettings(): void {
        this.saveToolManagerSettings(this.settings);
    }
} 