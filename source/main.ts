import { MCPServer } from './mcp-server';
import { readSettings, saveSettings } from './settings';
import { MCPServerSettings } from './types';
import { ToolManager } from './tools/tool-manager';
import { EXTENSION_NAME } from './constants';
import { t } from './utils/i18n';

let mcpServer: MCPServer | null = null;
let toolManager: ToolManager;

/**
 * @en Registration method for the main process of Extension
 */
export const methods: { [key: string]: (...any: any) => any } = {
    /**
     * @en Open the MCP server panel
     */
    openPanel() {
        Editor.Panel.open(EXTENSION_NAME);
    },
    openToolManager() {
        Editor.Panel.open(EXTENSION_NAME);
    },

    /**
     * @en Start the MCP server
     */
    async startServer() {
        if (mcpServer) {
            // Ensure latest tool configuration is used
            const enabledTools = toolManager.getEnabledTools();
            mcpServer.updateEnabledTools(enabledTools);
            await mcpServer.start();
        } else {
            console.warn(t('mcp_server_not_init'));
        }
    },

    /**
     * @en Stop the MCP server
     */
    async stopServer() {
        if (mcpServer) {
            mcpServer.stop();
        } else {
            console.warn(t('mcp_server_not_init'));
        }
    },

    /**
     * @en Get server status
     */
    getServerStatus() {
        const status = mcpServer ? mcpServer.getStatus() : { running: false, port: 0 };
        const settings = mcpServer ? mcpServer.getSettings() : readSettings();
        return {
            ...status,
            settings: settings
        };
    },

    /**
     * @en Update server settings
     */
    updateSettings(settings: MCPServerSettings) {
        saveSettings(settings);
        if (mcpServer) {
            mcpServer.stop();
            mcpServer = new MCPServer(settings);
            mcpServer.start();
        } else {
            mcpServer = new MCPServer(settings);
            mcpServer.start();
        }
    },

    /**
     * @en Get tools list
     */
    getToolsList() {
        return mcpServer ? mcpServer.getAvailableTools() : [];
    },

    /**
     * @en Execute tool for testing directly from the panel
     */
    async executeTool(toolName: string, args: any, category?: string) {
        if (!mcpServer) {
            throw new Error(t('mcp_server_not_init'));
        }
        try {
            return await mcpServer.executeToolCall(toolName, args);
        } catch (err: any) {
            if (category && !toolName.startsWith(category + '_')) {
                return await mcpServer.executeToolCall(`${category}_${toolName}`, args);
            }
            throw err;
        }
    },

    /**
     * @en Get server settings
     */
    async getServerSettings() {
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },

    // Tool manager methods
    async getToolManagerState() {
        return toolManager.getToolManagerState();
    },

    async createToolConfiguration(name: string, description?: string) {
        try {
            const config = toolManager.createConfiguration(name, description);
            return { success: true, id: config.id, config };
        } catch (error: any) {
            throw new Error(t('create_config_failed', [error.message]));
        }
    },

    async updateToolConfiguration(configId: string, updates: any) {
        try {
            return toolManager.updateConfiguration(configId, updates);
        } catch (error: any) {
            throw new Error(t('update_config_failed', [error.message]));
        }
    },

    async deleteToolConfiguration(configId: string) {
        try {
            toolManager.deleteConfiguration(configId);
            return { success: true };
        } catch (error: any) {
            throw new Error(t('delete_config_with_reason', [error.message]));
        }
    },

    async setCurrentToolConfiguration(configId: string) {
        try {
            toolManager.setCurrentConfiguration(configId);
            return { success: true };
        } catch (error: any) {
            throw new Error(t('set_current_config_failed', [error.message]));
        }
    },

    async updateToolStatus(category: string, toolName: string, enabled: boolean) {
        try {
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error(t('no_current_config'));
            }
            
            toolManager.updateToolStatus(currentConfig.id, category, toolName, enabled);
            
            // Update MCP server tool list
            if (mcpServer) {
                const enabledTools = toolManager.getEnabledTools();
                mcpServer.updateEnabledTools(enabledTools);
            }
            
            return { success: true };
        } catch (error: any) {
            throw new Error(t('update_tool_status_failed', [error.message]));
        }
    },

    async updateToolStatusBatch(updates: any[]) {
        try {
            console.log(`[Main] updateToolStatusBatch called with updates count:`, updates ? updates.length : 0);
            
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error(t('no_current_config'));
            }
            
            toolManager.updateToolStatusBatch(currentConfig.id, updates);
            
            // Update MCP server tool list
            if (mcpServer) {
                const enabledTools = toolManager.getEnabledTools();
                mcpServer.updateEnabledTools(enabledTools);
            }
            
            return { success: true };
        } catch (error: any) {
            throw new Error(t('batch_update_tool_status_failed', [error.message]));
        }
    },

    async exportToolConfiguration(configId: string) {
        try {
            return { configJson: toolManager.exportConfiguration(configId) };
        } catch (error: any) {
            throw new Error(t('export_config_failed', [error.message]));
        }
    },

    async importToolConfiguration(configJson: string) {
        try {
            return toolManager.importConfiguration(configJson);
        } catch (error: any) {
            throw new Error(t('import_config_failed', [error.message]));
        }
    },

    async getEnabledTools() {
        return toolManager.getEnabledTools();
    }
};

/**
 * @en Method Triggered on Extension Startup
 */
export function load() {
    console.log('Cocos MCP Server extension loaded');
    
    // Initialize tool manager
    toolManager = new ToolManager();
    
    // Read settings
    const settings = readSettings();
    mcpServer = new MCPServer(settings);
    
    // Initialize MCP server tools list
    const enabledTools = toolManager.getEnabledTools();
    mcpServer.updateEnabledTools(enabledTools);
    
    // If autoStart is enabled, start server
    if (settings.autoStart) {
        mcpServer.start().catch(err => {
            console.error('Failed to auto-start MCP server:', err);
        });
    }
}

/**
 * @en Method triggered when uninstalling the extension
 */
export function unload() {
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
}
