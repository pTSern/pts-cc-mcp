import * as http from 'http';
import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCPServerSettings, ServerStatus, ToolDefinition } from './types';
import { fixCommonJsonIssues } from './utils/json-utils';
import { sanitizeJsonSchemaForGemini } from './utils/schema-compat';
import {
    runWithMcpToolCallContext,
    completeMcpToolCallContext,
    McpRequestHeaders
} from './tool-call-context';

declare const Editor: any;

export class MCPServer {
    private settings: MCPServerSettings;
    private httpServer: http.Server | null = null;
    private mcpServer: McpServer | null = null;
    private tools: Record<string, any> = {};
    private toolsList: ToolDefinition[] = [];
    private enabledTools: any[] = []; // 存储启用的工具列表

    constructor(settings: MCPServerSettings) {
        this.settings = settings;
        this.initializeTools();
    }

    private getVersion(): string {
        try {
            const pkgPath = path.join(__dirname, '..', 'package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            return pkg.version || '0.0.0';
        } catch {
            return '0.0.0';
        }
    }

    private initializeTools(): void {
        try {
            console.log('[MCPServer] Initializing tools...');
            const toolModules: Record<string, string> = {
                scene: './tools/scene-tools',
                node: './tools/node-tools',
                component: './tools/component-tools',
                prefab: './tools/prefab-tools',
                project: './tools/project-tools',
                debug: './tools/debug-tools',
                preferences: './tools/preferences-tools',
                server: './tools/server-tools',
                broadcast: './tools/broadcast-tools',
                sceneView: './tools/scene-view-tools',
                referenceImage: './tools/reference-image-tools',
                assetAdvanced: './tools/asset-advanced-tools',
                validation: './tools/validation-tools',
                nexus: './tools/nexus-tools'
            };

            for (const [key, modPath] of Object.entries(toolModules)) {
                try {
                    const resolved = require.resolve(modPath);
                    delete require.cache[resolved];
                    const mod = require(modPath);
                    const exportKey = Object.keys(mod).find(k => k.toLowerCase().endsWith('tools')) || Object.keys(mod)[0];
                    if (exportKey && typeof mod[exportKey] === 'function') {
                        this.tools[key] = new mod[exportKey]();
                    }
                } catch (e) {
                    console.error(`[MCPServer] Failed to load tool ${key}:`, e);
                }
            }
            console.log('[MCPServer] Tools initialized successfully');
        } catch (error) {
            console.error('[MCPServer] Error initializing tools:', error);
            throw error;
        }
    }

    public async start(): Promise<void> {
        if (this.httpServer) {
            console.log('[MCPServer] Server is already running');
            return;
        }

        try {
            this.setupTools();

            console.log(`[MCPServer] Starting HTTP server on port ${this.settings.port}...`);
            this.httpServer = http.createServer(this.handleHttpRequest.bind(this));

            await new Promise<void>((resolve, reject) => {
                this.httpServer!.listen(this.settings.port, '127.0.0.1', () => {
                    console.log(`[MCPServer] ✅ HTTP server started successfully on http://127.0.0.1:${this.settings.port}`);
                    console.log(`[MCPServer] Health check: http://127.0.0.1:${this.settings.port}/health`);
                    console.log(`[MCPServer] MCP endpoint: http://127.0.0.1:${this.settings.port}/mcp`);
                    resolve();
                });
                this.httpServer!.on('error', (err: any) => {
                    console.error('[MCPServer] ❌ Failed to start server:', err);
                    if (err.code === 'EADDRINUSE') {
                        console.error(`[MCPServer] Port ${this.settings.port} is already in use. Please change the port in settings.`);
                    }
                    reject(err);
                });
            });

            console.log('[MCPServer] 🚀 MCP Server is ready for connections');
        } catch (error) {
            console.error('[MCPServer] ❌ Failed to start server:', error);
            throw error;
        }
    }

    private setupTools(): void {
        this.toolsList = [];

        // 如果没有启用工具配置，返回所有工具
        if (!this.enabledTools || this.enabledTools.length === 0) {
            for (const [category, toolSet] of Object.entries(this.tools)) {
                const tools = toolSet.getTools();
                for (const tool of tools) {
                    this.toolsList.push({
                        name: `${category}_${tool.name}`,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    });
                }
            }
        } else {
            // 根据启用的工具配置过滤
            const enabledToolNames = new Set(this.enabledTools.map(tool => `${tool.category}_${tool.name}`));

            for (const [category, toolSet] of Object.entries(this.tools)) {
                const tools = toolSet.getTools();
                for (const tool of tools) {
                    const toolName = `${category}_${tool.name}`;
                    if (enabledToolNames.has(toolName)) {
                        this.toolsList.push({
                            name: toolName,
                            description: tool.description,
                            inputSchema: tool.inputSchema
                        });
                    }
                }
            }
        }

        // Initialize MCP SDK server
        this.mcpServer = new McpServer({
            name: 'cocos-mcp-server',
            version: this.getVersion()
        }, {
            capabilities: {
                tools: {},
                resources: {
                    subscribe: true,
                    listChanged: true
                },
                logging: {}
            }
        });

        // 1. tools/list: Gemini-safe sanitized schemas without $ref
        this.mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const tools = this.toolsList.map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: sanitizeJsonSchemaForGemini(tool.inputSchema)
            }));
            return { tools };
        });

        // 2. tools/call: AsyncLocalStorage context, headers, and execution
        this.mcpServer.server.setRequestHandler(CallToolRequestSchema, async (request, extra: any) => {
            const { name, arguments: args } = request.params;
            const headers: McpRequestHeaders | undefined = extra?.requestInfo?.headers;

            return await runWithMcpToolCallContext(headers, async () => {
                try {
                    const toolResult = await this.executeToolCall(name, args);
                    return {
                        content: [{
                            type: 'text' as const,
                            text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
                        }]
                    };
                } finally {
                    try {
                        await completeMcpToolCallContext();
                    } catch (finErr) {
                        console.error('[MCPServer] Tool finalization failed:', finErr);
                    }
                }
            });
        });

        // 3. Register MCP Resources
        this.setupResources();

        console.log(`[MCPServer] Setup tools: ${this.toolsList.length} tools available via @modelcontextprotocol/sdk`);
    }

    private setupResources(): void {
        if (!this.mcpServer) return;

        // Resource Template: cocos://assets/{ccType}
        const assetTemplate = new ResourceTemplate('cocos://assets/{ccType}', { list: undefined });
        this.mcpServer.resource(
            'project-assets-by-type',
            assetTemplate,
            {
                title: 'Project Assets by Type',
                description: 'Query project assets filtered by ccType, e.g. cc.ImageAsset, cc.Prefab, cc.Material, cc.SceneAsset, cc.Script',
                mimeType: 'application/json'
            },
            async (uri: URL, variables: Record<string, any>) => {
                const ccType = String(variables.ccType || '');
                try {
                    if (typeof Editor !== 'undefined' && Editor.Message) {
                        const assets = await Editor.Message.request('asset-db', 'query-assets', { ccType });
                        return {
                            contents: [{
                                uri: uri.href,
                                mimeType: 'application/json',
                                text: JSON.stringify(assets || [], null, 2)
                            }]
                        };
                    }
                    return {
                        contents: [{
                            uri: uri.href,
                            mimeType: 'application/json',
                            text: JSON.stringify({ error: 'Editor AssetDB unavailable' })
                        }]
                    };
                } catch (err: any) {
                    return {
                        contents: [{
                            uri: uri.href,
                            mimeType: 'application/json',
                            text: JSON.stringify({ error: err.message })
                        }]
                    };
                }
            }
        );

        // Resource: cocos://scene/hierarchy
        this.mcpServer.resource(
            'current-scene-hierarchy',
            'cocos://scene/hierarchy',
            {
                title: 'Current Scene Hierarchy',
                description: 'Snapshot of active scene node tree and hierarchy',
                mimeType: 'application/json'
            },
            async (uri: URL) => {
                try {
                    if (typeof Editor !== 'undefined' && Editor.Message) {
                        const tree = await Editor.Message.request('scene', 'query-node-tree');
                        return {
                            contents: [{
                                uri: uri.href,
                                mimeType: 'application/json',
                                text: JSON.stringify(tree || {}, null, 2)
                            }]
                        };
                    }
                    return {
                        contents: [{
                            uri: uri.href,
                            mimeType: 'application/json',
                            text: JSON.stringify({ error: 'Editor Scene unavailable' })
                        }]
                    };
                } catch (err: any) {
                    return {
                        contents: [{
                            uri: uri.href,
                            mimeType: 'application/json',
                            text: JSON.stringify({ error: err.message })
                        }]
                    };
                }
            }
        );
    }

    public async executeToolCall(toolName: string, args: any): Promise<any> {
        const parts = toolName.split('_');
        const category = parts[0];
        const toolMethodName = parts.slice(1).join('_');

        if (this.tools[category]) {
            const start = Date.now();
            try {
                const result = await this.tools[category].execute(toolMethodName, args);
                if (this.settings.enableDebugLog) {
                    console.log(`[MCPServer] Executed ${toolName} in ${Date.now() - start}ms`);
                }
                return result;
            } catch (err) {
                console.error(`[MCPServer] Failed ${toolName} in ${Date.now() - start}ms:`, err);
                throw err;
            }
        }

        throw new Error(`Tool ${toolName} not found`);
    }

    public getAvailableTools(): ToolDefinition[] {
        return this.toolsList.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: sanitizeJsonSchemaForGemini(tool.inputSchema)
        }));
    }

    public updateEnabledTools(enabledTools: any[]): void {
        console.log(`[MCPServer] Updating enabled tools: ${enabledTools.length} tools`);
        this.enabledTools = enabledTools;
        this.setupTools(); // 重新设置工具列表
    }

    public getSettings(): MCPServerSettings {
        return this.settings;
    }

    private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            if (pathname === '/mcp') {
                if (req.method === 'POST') {
                    await this.handleMCPRequest(req, res);
                } else {
                    res.writeHead(405, { 'Allow': 'POST', 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST for /mcp endpoint' }));
                }
            } else if (pathname === '/health' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', tools: this.toolsList.length }));
            } else if (pathname?.startsWith('/api/') && req.method === 'POST') {
                await this.handleSimpleAPIRequest(req, res, pathname);
            } else if (pathname === '/api/tools' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ tools: this.getSimplifiedToolsList() }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error) {
            console.error('HTTP request error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }

    private async handleMCPRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            let parsedMessage: any = null;
            if (body && body.trim()) {
                try {
                    parsedMessage = JSON.parse(body);
                } catch (parseError: any) {
                    // Try to fix common JSON issues
                    const fixedBody = fixCommonJsonIssues(body);
                    try {
                        parsedMessage = JSON.parse(fixedBody);
                        console.log('[MCPServer] Fixed JSON parsing issue');
                    } catch {
                        // ignore and try raw
                    }
                }
            }

            // Attempt Streamable HTTP Transport first if McpServer is initialized
            if (this.mcpServer) {
                try {
                    const transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: undefined,
                        enableJsonResponse: true
                    });

                    res.on('close', () => {
                        transport.close();
                    });

                    await this.mcpServer.connect(transport);
                    await transport.handleRequest(req, res, parsedMessage);
                    return;
                } catch (transportError: any) {
                    console.warn('[MCPServer] Streamable transport error, falling back to JSON-RPC handler:', transportError?.message);
                }
            }

            // Fallback: direct JSON-RPC handler
            try {
                if (!parsedMessage) {
                    throw new Error('Empty request body');
                }
                const response = await this.handleMessage(parsedMessage);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
            } catch (error: any) {
                console.error('Error handling fallback MCP request:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: parsedMessage?.id || null,
                    error: {
                        code: -32700,
                        message: `Parse error: ${error.message}`
                    }
                }));
            }
        });
    }

    private async handleMessage(message: any): Promise<any> {
        const { id, method, params } = message;

        try {
            let result: any;

            switch (method) {
                case 'tools/list':
                    result = { tools: this.getAvailableTools() };
                    break;
                case 'tools/call':
                    const { name, arguments: args } = params;
                    const toolResult = await this.executeToolCall(name, args);
                    result = {
                        content: [{
                            type: 'text',
                            text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
                        }]
                    };
                    break;
                case 'initialize':
                    result = {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {},
                            resources: {
                                subscribe: true,
                                listChanged: true,
                                templates: true
                            }
                        },
                        serverInfo: {
                            name: 'cocos-mcp-server',
                            version: this.getVersion()
                        }
                    };
                    break;
                default:
                    throw new Error(`Unknown method: ${method}`);
            }

            return {
                jsonrpc: '2.0',
                id,
                result
            };
        } catch (error: any) {
            return {
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32603,
                    message: error.message
                }
            };
        }
    }

    public stop(): void {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            console.log('[MCPServer] HTTP server stopped');
        }
    }

    public getStatus(): ServerStatus {
        return {
            running: !!this.httpServer,
            port: this.settings.port
        };
    }

    private async handleSimpleAPIRequest(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<void> {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                // Extract tool name from path like /api/node/set_position
                const pathParts = pathname.split('/').filter(p => p);
                if (pathParts.length < 3) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid API path. Use /api/{category}/{tool_name}' }));
                    return;
                }

                const category = pathParts[1];
                const toolName = pathParts[2];
                const fullToolName = `${category}_${toolName}`;

                // Parse parameters with enhanced error handling
                let params;
                try {
                    params = body ? JSON.parse(body) : {};
                } catch (parseError: any) {
                    const fixedBody = fixCommonJsonIssues(body);
                    try {
                        params = JSON.parse(fixedBody);
                        console.log('[MCPServer] Fixed API JSON parsing issue');
                    } catch {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: 'Invalid JSON in request body',
                            details: parseError.message,
                            receivedBody: body.substring(0, 200)
                        }));
                        return;
                    }
                }

                // Execute tool
                const result = await this.executeToolCall(fullToolName, params);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    tool: fullToolName,
                    result: result
                }));

            } catch (error: any) {
                console.error('Simple API error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message,
                    tool: pathname
                }));
            }
        });
    }

    private getSimplifiedToolsList(): any[] {
        return this.toolsList.map(tool => {
            const parts = tool.name.split('_');
            const category = parts[0];
            const toolName = parts.slice(1).join('_');

            return {
                name: tool.name,
                category: category,
                toolName: toolName,
                description: tool.description,
                apiPath: `/api/${category}/${toolName}`,
                curlExample: this.generateCurlExample(category, toolName, tool.inputSchema)
            };
        });
    }

    private generateCurlExample(category: string, toolName: string, schema: any): string {
        const sampleParams = this.generateSampleParams(schema);
        const jsonString = JSON.stringify(sampleParams, null, 2);

        return `curl -X POST http://127.0.0.1:${this.settings.port}/api/${category}/${toolName} \\
  -H "Content-Type: application/json" \\
  -d '${jsonString}'`;
    }

    private generateSampleParams(schema: any): any {
        if (!schema || !schema.properties) return {};

        const sample: any = {};
        for (const [key, prop] of Object.entries(schema.properties as any)) {
            const propSchema = prop as any;
            switch (propSchema.type) {
                case 'string':
                    sample[key] = propSchema.default || 'example_string';
                    break;
                case 'number':
                    sample[key] = propSchema.default || 42;
                    break;
                case 'boolean':
                    sample[key] = propSchema.default || true;
                    break;
                case 'object':
                    sample[key] = propSchema.default || { x: 0, y: 0, z: 0 };
                    break;
                default:
                    sample[key] = 'example_value';
            }
        }
        return sample;
    }

    public updateSettings(settings: MCPServerSettings) {
        this.settings = settings;
        if (this.httpServer) {
            this.stop();
            this.start();
        }
    }
}
