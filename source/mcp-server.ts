import * as http from 'http';
import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCPServerSettings, ServerStatus, ToolDefinition } from './types';
import { fixCommonJsonIssues } from './utils/json-utils';
import { sanitizeJsonSchemaForGemini } from './utils/schema-compat';
import {
    runWithMcpToolCallContext,
    completeMcpToolCallContext,
    McpRequestHeaders
} from './tool-call-context';
import { EXTENSION_NAME } from './constants';
import { IntentDispatcher } from './tools/intent-dispatcher';

declare const Editor: any;

interface StreamableSession {
    transport: StreamableHTTPServerTransport;
    server: McpServer;
    lastActive: number;
}

interface SseSession {
    transport: SSEServerTransport;
    server: McpServer;
    lastActive: number;
}

export class MCPServer {
    private static instance: MCPServer | null = null;
    private settings: MCPServerSettings;
    private httpServer: http.Server | null = null;
    private mcpServer: McpServer | null = null;
    private tools: Record<string, any> = {};
    private intentDispatcher: IntentDispatcher | null = null;
    private toolsList: ToolDefinition[] = [];
    private enabledTools: any[] = []; // Store list of enabled tools
    private streamableSessions: Map<string, StreamableSession> = new Map();
    private sseSessions: Map<string, SseSession> = new Map();
    private sessionCleanupTimer: NodeJS.Timeout | null = null;

    constructor(settings: MCPServerSettings) {
        MCPServer.instance = this;
        this.settings = settings;
        this.initializeTools();
        this.setupTools();
    }

    public static getInstance(): MCPServer | null {
        return MCPServer.instance;
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
                nexus: './tools/nexus-tools',
                game: './tools/game-tools',
                animgraph: './tools/animgraph-tools',
                animation: './tools/animation-tools',
                batch: './tools/batch-tools',
                knowledge: './tools/knowledge-tools',
                uiBuilder: './tools/ui-builder-tools'
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

            this.intentDispatcher = new IntentDispatcher(this.tools);
            console.log('[MCPServer] Tools & Unified Intent Dispatcher initialized successfully');
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
                    console.log(`[MCPServer] ✅ HTTP & Streamable server started successfully on http://127.0.0.1:${this.settings.port}`);
                    console.log(`[MCPServer] 📡 Streamable HTTP endpoint: http://127.0.0.1:${this.settings.port}/mcp`);
                    console.log(`[MCPServer] 🌊 SSE endpoint: http://127.0.0.1:${this.settings.port}/sse`);
                    console.log(`[MCPServer] 🩺 Health check: http://127.0.0.1:${this.settings.port}/health`);
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

            this.sessionCleanupTimer = setInterval(() => {
                this.cleanupStaleSessions();
            }, 5 * 60 * 1000);

            console.log('[MCPServer] 🚀 MCP Server is ready for connections (Streamable HTTP + SSE + Direct)');
        } catch (error) {
            console.error('[MCPServer] ❌ Failed to start server:', error);
            throw error;
        }
    }

    private setupTools(): void {
        this.toolsList = [];

        // Primary: Serve the 16 Unified Intent Tools
        if (this.intentDispatcher) {
            const intentTools = this.intentDispatcher.getIntentTools();
            if (!this.enabledTools || this.enabledTools.length === 0) {
                this.toolsList = [...intentTools];
            } else {
                const enabledNames = new Set(this.enabledTools.map(t => t.name || `${t.category}_${t.name}`));
                this.toolsList = intentTools.filter(tool => {
                    if (enabledNames.has(tool.name)) return true;
                    const baseCategory = tool.name.split('_')[0];
                    for (const en of enabledNames) {
                        if (en.startsWith(baseCategory) || en.startsWith(tool.name)) return true;
                    }
                    return false;
                });
                if (this.toolsList.length === 0) {
                    this.toolsList = [...intentTools];
                }
            }
        } else {
            // Fallback to legacy categories if dispatcher is not ready
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
        }

        // Initialize MCP SDK server
        this.mcpServer = this.createMcpServerInstance();
        console.log(`[MCPServer] Setup tools: ${this.toolsList.length} Intent Tools available via @modelcontextprotocol/sdk`);
    }

    public createMcpServerInstance(): McpServer {
        const server = new McpServer({
            name: EXTENSION_NAME,
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
        server.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const tools = this.toolsList.map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: sanitizeJsonSchemaForGemini(tool.inputSchema)
            }));
            return { tools };
        });

        // 2. tools/call: AsyncLocalStorage context, headers, and execution
        server.server.setRequestHandler(CallToolRequestSchema, async (request, extra: any) => {
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
        this.setupResources(server);
        return server;
    }

    private setupResources(server: McpServer): void {
        if (!server) return;

        // Resource Template: cocos://assets/{ccType}
        const assetTemplate = new ResourceTemplate('cocos://assets/{ccType}', { list: undefined });
        server.resource(
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
        server.resource(
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
        if (this.intentDispatcher) {
            const start = Date.now();
            try {
                const result = await this.intentDispatcher.execute(toolName, args);
                if (this.settings.enableDebugLog) {
                    console.log(`[MCPServer] Executed ${toolName} via IntentDispatcher in ${Date.now() - start}ms`);
                }
                return result;
            } catch (err: any) {
                console.error(`[MCPServer] Failed ${toolName} in ${Date.now() - start}ms:`, err);
                throw err;
            }
        }

        // Direct tool aliases fallback
        if (toolName === 'editor_batch_execute' || toolName === 'batch_execute') {
            if (this.tools['batch']) {
                return await this.tools['batch'].execute('execute', args);
            }
        }
        if (toolName === 'animgraph_manage') {
            if (this.tools['animgraph']) {
                return await this.tools['animgraph'].execute('manage', args);
            }
        }
        if (toolName === 'editor_compile_status' || toolName === 'compile_status') {
            if (this.tools['debug']) {
                return await this.tools['debug'].execute('compile_status', args);
            }
        }
        if (toolName === 'spine_setup') {
            if (this.tools['component']) {
                return await this.tools['component'].execute('spine_setup', args);
            }
        }

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
        this.setupTools(); // Reset tools list
    }

    public getSettings(): MCPServerSettings {
        return this.settings;
    }

    private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Mcp-Session-Id, mcp-session-id, Mcp-Protocol-Version, mcp-protocol-version');
        res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, mcp-session-id');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            if (pathname === '/sse') {
                if (req.method === 'GET') {
                    await this.handleSSERequest(req, res);
                } else {
                    res.writeHead(405, { 'Allow': 'GET, OPTIONS', 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Method Not Allowed. Use GET for /sse endpoint' }));
                }
            } else if (pathname === '/messages') {
                if (req.method === 'POST') {
                    await this.handleSSEPostMessage(req, res, parsedUrl);
                } else {
                    res.writeHead(405, { 'Allow': 'POST, OPTIONS', 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST for /messages endpoint' }));
                }
            } else if (pathname === '/mcp') {
                if (req.method === 'GET') {
                    await this.handleStreamableHttpGet(req, res, parsedUrl);
                } else if (req.method === 'POST') {
                    await this.handleMCPRequest(req, res, parsedUrl);
                } else if (req.method === 'DELETE') {
                    await this.handleStreamableHttpDelete(req, res, parsedUrl);
                } else {
                    res.writeHead(405, { 'Allow': 'GET, POST, DELETE, OPTIONS', 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Method Not Allowed. Use GET, POST, or DELETE for /mcp endpoint' }));
                }
            } else if ((pathname === '/health' || pathname === '/api/health') && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'ok',
                    tools: this.toolsList.length,
                    intentTools: this.toolsList.length,
                    operations: 231,
                    transport: this.settings.transport || 'streamable_http',
                    activeSseSessions: this.sseSessions.size,
                    activeStreamableSessions: this.streamableSessions.size,
                    version: this.getVersion()
                }));
            } else if (pathname?.startsWith('/api/') && req.method === 'POST') {
                await this.handleSimpleAPIRequest(req, res, pathname);
            } else if (pathname === '/api/tools' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ tools: this.getSimplifiedToolsList() }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error: any) {
            console.error('HTTP request error:', error);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error', details: error?.message }));
            }
        }
    }

    private async handleSSERequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        try {
            console.log('[MCPServer] ⚡ Establishing new SSE connection on /sse...');
            const transport = new SSEServerTransport('/messages', res);
            const server = this.createMcpServerInstance();
            const sessionId = transport.sessionId;

            this.sseSessions.set(sessionId, {
                transport,
                server,
                lastActive: Date.now()
            });

            transport.onclose = () => {
                console.log(`[MCPServer] SSE connection closed for session: ${sessionId}`);
                this.sseSessions.delete(sessionId);
            };

            await server.connect(transport);
            console.log(`[MCPServer] ✅ SSE connection established successfully (sessionId: ${sessionId})`);
        } catch (error: any) {
            console.error('[MCPServer] ❌ Failed to establish SSE connection:', error);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Failed to establish SSE connection: ${error.message}` }));
            }
        }
    }

    private async handleSSEPostMessage(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery): Promise<void> {
        const sessionId = (parsedUrl.query.sessionId as string) || (req.headers['mcp-session-id'] as string);
        if (!sessionId || !this.sseSessions.has(sessionId)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Session not found: ${sessionId || 'missing'}` }));
            return;
        }

        const session = this.sseSessions.get(sessionId)!;
        session.lastActive = Date.now();

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            let parsedBody: any = null;
            if (body && body.trim()) {
                try {
                    parsedBody = JSON.parse(body);
                } catch {
                    const fixed = fixCommonJsonIssues(body);
                    try { parsedBody = JSON.parse(fixed); } catch {}
                }
            }

            try {
                await session.transport.handlePostMessage(req, res, parsedBody);
            } catch (err: any) {
                console.error('[MCPServer] Error handling SSE POST message:', err);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            }
        });
    }

    private async handleStreamableHttpGet(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery): Promise<void> {
        const sessionId = (req.headers['mcp-session-id'] as string) || (parsedUrl.query.sessionId as string);
        if (sessionId && this.streamableSessions.has(sessionId)) {
            const session = this.streamableSessions.get(sessionId)!;
            session.lastActive = Date.now();
            await session.transport.handleRequest(req, res);
            return;
        }

        const accept = req.headers['accept'] || '';
        if (accept.includes('text/event-stream')) {
            const newSessionId = crypto.randomUUID();
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => newSessionId,
                enableJsonResponse: true
            });
            const server = this.createMcpServerInstance();
            this.streamableSessions.set(newSessionId, { transport, server, lastActive: Date.now() });

            transport.onclose = () => {
                this.streamableSessions.delete(newSessionId);
            };

            await server.connect(transport);
            await transport.handleRequest(req, res);
            return;
        }

        res.writeHead(405, { 'Allow': 'POST, GET, OPTIONS', 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GET on /mcp requires Accept: text/event-stream or a valid Mcp-Session-Id' }));
    }

    private async handleStreamableHttpDelete(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery): Promise<void> {
        const sessionId = (req.headers['mcp-session-id'] as string) || (parsedUrl.query.sessionId as string);
        if (sessionId && this.streamableSessions.has(sessionId)) {
            const session = this.streamableSessions.get(sessionId)!;
            try { await session.transport.close(); } catch {}
            this.streamableSessions.delete(sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: `Session ${sessionId} closed` }));
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not found' }));
    }

    private async handleMCPRequest(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery): Promise<void> {
        let body = '';
        req.on('data', (chunk) => { body += chunk.toString(); });
        req.on('end', async () => {
            let parsedMessage: any = null;
            if (body && body.trim()) {
                try {
                    parsedMessage = JSON.parse(body);
                } catch {
                    const fixedBody = fixCommonJsonIssues(body);
                    try { parsedMessage = JSON.parse(fixedBody); } catch {}
                }
            }

            const sessionId = (req.headers['mcp-session-id'] as string) || (parsedUrl.query.sessionId as string);

            // 1. Existing Streamable HTTP session
            if (sessionId && this.streamableSessions.has(sessionId)) {
                const session = this.streamableSessions.get(sessionId)!;
                session.lastActive = Date.now();
                try {
                    await session.transport.handleRequest(req, res, parsedMessage);
                    return;
                } catch (err: any) {
                    console.warn(`[MCPServer] Error handling request in session ${sessionId}:`, err.message);
                }
            }

            // 2. Initialize request - create a new Streamable HTTP session
            const isInit = parsedMessage && (
                parsedMessage.method === 'initialize' ||
                (Array.isArray(parsedMessage) && parsedMessage.some((m: any) => m.method === 'initialize'))
            );

            if (isInit) {
                try {
                    const newSessionId = crypto.randomUUID();
                    const transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => newSessionId,
                        enableJsonResponse: true
                    });
                    const server = this.createMcpServerInstance();
                    this.streamableSessions.set(newSessionId, { transport, server, lastActive: Date.now() });

                    transport.onclose = () => {
                        this.streamableSessions.delete(newSessionId);
                    };

                    await server.connect(transport);
                    await transport.handleRequest(req, res, parsedMessage);
                    return;
                } catch (initErr: any) {
                    console.error('[MCPServer] Failed Streamable init, falling back to direct JSON-RPC:', initErr);
                }
            }

            // 3. Fallback: Direct JSON-RPC response (for Cursor, CLI, testing tools)
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

    private cleanupStaleSessions(): void {
        const now = Date.now();
        const MAX_IDLE_MS = 30 * 60 * 1000; // 30 minutes

        for (const [id, session] of this.streamableSessions.entries()) {
            if (now - session.lastActive > MAX_IDLE_MS) {
                try { session.transport.close(); } catch {}
                this.streamableSessions.delete(id);
            }
        }
        for (const [id, session] of this.sseSessions.entries()) {
            if (now - session.lastActive > MAX_IDLE_MS) {
                try { session.transport.close(); } catch {}
                this.sseSessions.delete(id);
            }
        }
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
                            name: EXTENSION_NAME,
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
        if (this.sessionCleanupTimer) {
            clearInterval(this.sessionCleanupTimer);
            this.sessionCleanupTimer = null;
        }

        for (const [id, session] of this.streamableSessions.entries()) {
            try { session.transport.close(); } catch {}
        }
        this.streamableSessions.clear();

        for (const [id, session] of this.sseSessions.entries()) {
            try { session.transport.close(); } catch {}
        }
        this.sseSessions.clear();

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
