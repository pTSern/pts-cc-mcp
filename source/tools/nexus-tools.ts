import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import * as path from 'path';
import * as fs from 'fs';
import { isNexusAvailable } from '../utils/nexus-checker';

export class NexusTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'nexus_manage',
                description: 'PROJECT ARCHITECTURE & TREE GRAPHS: Query scene node flow trees with workflows/components, function execution call pipelines, and pEngine.Json/pTSAsset event dependency networks in ASCII or JSON format. Ideal for LLM reasoning.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_tree_graph', 'list_scenes', 'list_workflows', 'scan_network', 'query_event', 'generate_html'],
                            description: 'Nexus action opcode'
                        },
                        type: {
                            type: 'string',
                            enum: ['scene_flow', 'workflow', 'event_nexus', 'list_scenes', 'list_workflows'],
                            description: 'Graph type to query: "scene_flow" (Node hierarchy + workflows), "workflow" (Function call pipeline), "event_nexus" (Event & asset network), "list_scenes" (All indexed scenes/prefabs), "list_workflows" (All execution pipelines)'
                        },
                        target: {
                            type: 'string',
                            description: 'Target identifier: scene/prefab filename (e.g. "fast_test.scene" or "assets/test_bund/fast_test.scene"), workflow method, or event name'
                        },
                        nodePath: {
                            type: 'string',
                            description: 'Optional subpath filter in scene tree (e.g. "Canvas/GameLayer")'
                        },
                        format: {
                            type: 'string',
                            enum: ['both', 'ascii', 'json'],
                            default: 'both',
                            description: 'Result format. "ascii" is optimal for token-efficient LLM context; "json" for structured data; "both" includes both'
                        },
                        maxDepth: {
                            type: 'number',
                            default: 10,
                            description: 'Max tree traversal depth'
                        },
                        domainFilter: {
                            type: 'string',
                            description: 'Domain filter for scan_network (e.g. "ALL", "UI Navigation", etc.)'
                        },
                        eventNameOrUuid: {
                            type: 'string',
                            description: 'Event name or UUID for query_event'
                        },
                        outputPath: {
                            type: 'string',
                            description: 'Output HTML path for generate_html'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'nexus_get_tree_graph',
                description: 'TREE GRAPH QUERY (LLM/Agent Optimized): Extract clean ASCII trees and structured JSON of scene node hierarchies (including attached components & (Workflow) triggers), function execution call pipelines, or JsonAsset/pTSAsset event dependencies.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['scene_flow', 'workflow', 'event_nexus', 'list_scenes', 'list_workflows'],
                            default: 'scene_flow',
                            description: 'Graph type to query'
                        },
                        target: {
                            type: 'string',
                            description: 'Target identifier: scene/prefab filename (e.g. "fast_test.scene"), workflow method, or event name'
                        },
                        nodePath: {
                            type: 'string',
                            description: 'Optional path filter within scene hierarchy (e.g. "Canvas/Camera")'
                        },
                        format: {
                            type: 'string',
                            enum: ['both', 'ascii', 'json'],
                            default: 'both',
                            description: 'Format of output. "ascii" is optimal for LLM context prompts.'
                        },
                        maxDepth: {
                            type: 'number',
                            default: 10,
                            description: 'Max tree depth'
                        }
                    }
                }
            },
            {
                name: 'nexus_scan_network',
                description: 'EVENT NEXUS SCANNER: Deep scan all scenes, prefabs, and TypeScript scripts to build the pEngine.Json Event & Parameter dependency network.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        domainFilter: {
                            type: 'string',
                            enum: ['ALL', 'UI Navigation', 'Match-3 Gameplay', 'Ads System', 'Economy & Data', 'Firebase & Auth', 'Home Builder'],
                            description: 'Optional filter by domain',
                            default: 'ALL'
                        }
                    }
                }
            },
            {
                name: 'nexus_query_event',
                description: 'EVENT NEXUS QUERY: Query all callers (emitters) and subscribers (listeners) for a specific JsonAsset event or parameter.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        eventNameOrUuid: {
                            type: 'string',
                            description: 'JsonAsset file name (e.g. "Event.UI.onOpenHomeScreen.json") or UUID'
                        }
                    },
                    required: ['eventNameOrUuid']
                }
            },
            {
                name: 'nexus_generate_html',
                description: 'EVENT NEXUS HTML EXPORT: Generate/update the standalone n8n-style interactive HTML visualizer on disk.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        outputPath: {
                            type: 'string',
                            description: 'Optional output file path (defaults to ./json_event_network.html)'
                        }
                    }
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        if (!isNexusAvailable()) {
            return {
                success: false,
                error: 'pts-nexus extension is not installed or is disabled in the project.'
            };
        }

        switch (toolName) {
            case 'nexus_manage':
                return this.handleNexusManage(args);
            case 'nexus_get_tree_graph':
            case 'get_tree_graph':
            case 'query_tree':
                return this.getTreeGraph(args);
            case 'nexus_scan_network':
                return this.scanNetwork(args?.domainFilter);
            case 'nexus_query_event':
                return this.queryEvent(args?.eventNameOrUuid || args?.target);
            case 'nexus_generate_html':
                return this.generateHtml(args?.outputPath);
            default:
                throw new Error(`Unknown nexus tool: ${toolName}`);
        }
    }

    private async handleNexusManage(args: any): Promise<ToolResponse> {
        const action = args?.action;
        switch (action) {
            case 'get_tree_graph':
                return this.getTreeGraph(args);
            case 'list_scenes':
                return this.getTreeGraph({ ...args, type: 'list_scenes' });
            case 'list_workflows':
                return this.getTreeGraph({ ...args, type: 'list_workflows' });
            case 'scan_network':
                return this.scanNetwork(args?.domainFilter);
            case 'query_event':
                return this.queryEvent(args?.eventNameOrUuid || args?.target);
            case 'generate_html':
                return this.generateHtml(args?.outputPath);
            default:
                if (args?.target || args?.type) {
                    return this.getTreeGraph(args);
                }
                return { success: false, error: `Unknown nexus action: ${action}` };
        }
    }

    private getProjectPath(): string {
        if (typeof Editor !== 'undefined' && (Editor as any)?.Project?.path) {
            return (Editor as any).Project.path;
        }
        let cur = __dirname;
        for (let i = 0; i < 5; i++) {
            if (fs.existsSync(path.join(cur, 'assets')) && fs.existsSync(path.join(cur, 'extensions'))) {
                return cur;
            }
            cur = path.dirname(cur);
        }
        return process.cwd();
    }

    public async getTreeGraph(args: any = {}): Promise<ToolResponse> {
        try {
            const queryOptions = {
                type: args?.type,
                target: args?.target,
                nodePath: args?.nodePath,
                format: args?.format || 'both',
                maxDepth: typeof args?.maxDepth === 'number' ? args?.maxDepth : 10
            };

            let result: any = null;
            // 1. Try Editor IPC message
            try {
                result = await Editor.Message.request('pts-nexus', 'get-tree-graph', queryOptions);
            } catch {
                // 2. Direct require fallback
                const projectPath = this.getProjectPath();
                const queryEnginePath = path.join(projectPath, 'extensions/pts-nexus/dist/engine/TreeGraphQueryEngine');
                if (fs.existsSync(queryEnginePath + '.js')) {
                    const { TreeGraphQueryEngine } = require(queryEnginePath);
                    result = await TreeGraphQueryEngine.query(projectPath, queryOptions);
                }
            }

            if (!result) {
                return {
                    success: false,
                    error: 'Could not query tree graph. Make sure pts-nexus extension is built.'
                };
            }

            let message = result.message || 'Tree graph retrieved successfully';
            if (result.asciiTree) {
                message = `${message}\n\n${result.asciiTree}`;
            }

            return {
                success: result.success !== false,
                message: message,
                data: result.data,
                ...(result.asciiTree ? { asciiTree: result.asciiTree } : {})
            };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    private async scanNetwork(domainFilter: string = 'ALL'): Promise<ToolResponse> {
        try {
            // Request scan from pts-nexus extension or fallback to direct build
            let graph: any = null;
            try {
                graph = await Editor.Message.request('pts-nexus', 'scan-network');
            } catch {
                // If message fails, import builder from pts-nexus directly
                const projectPath = this.getProjectPath();
                const nexusBuilderPath = path.join(projectPath, 'extensions/pts-nexus/dist/engine/NexusGraphBuilder');
                if (fs.existsSync(nexusBuilderPath + '.js')) {
                    const { NexusGraphBuilder } = require(nexusBuilderPath);
                    graph = await NexusGraphBuilder.build(projectPath);
                }
            }

            if (!graph) {
                return { success: false, error: 'Could not execute nexus scan. Make sure pts-nexus extension is built.' };
            }

            if (domainFilter && domainFilter !== 'ALL') {
                const filtered: Record<string, any> = {};
                for (const [k, v] of Object.entries(graph as Record<string, any>)) {
                    if (v.domain === domainFilter) {
                        filtered[k] = v;
                    }
                }
                graph = filtered;
            }

            return {
                success: true,
                message: `✅ Scanned ${Object.keys(graph).length} event/param nodes in domain: ${domainFilter}`,
                data: graph
            };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    private async queryEvent(nameOrUuid: string): Promise<ToolResponse> {
        try {
            if (!nameOrUuid) {
                return { success: false, error: 'eventNameOrUuid is required' };
            }

            const scanRes = await this.scanNetwork('ALL');
            if (!scanRes.success || !scanRes.data) {
                return scanRes;
            }

            const graph: Record<string, any> = scanRes.data;
            const targetLower = nameOrUuid.toLowerCase();

            // Find matching node
            let foundKey = Object.keys(graph).find(k => k === nameOrUuid);
            if (!foundKey) {
                foundKey = Object.keys(graph).find(k => {
                    const node = graph[k];
                    return node.name.toLowerCase() === targetLower ||
                           node.path.toLowerCase().includes(targetLower) ||
                           node.name.toLowerCase().includes(targetLower);
                });
            }

            if (!foundKey) {
                return { success: false, error: `Event or parameter '${nameOrUuid}' not found in project graph.` };
            }

            const eventNode = graph[foundKey];
            return {
                success: true,
                message: `✅ Found event: ${eventNode.name}`,
                data: eventNode
            };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    private async generateHtml(outputPath?: string): Promise<ToolResponse> {
        try {
            const res = await Editor.Message.request('pts-nexus', 'generate-html', outputPath);
            return {
                success: true,
                message: '✅ Standalone HTML network visualizer generated',
                data: res
            };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}
