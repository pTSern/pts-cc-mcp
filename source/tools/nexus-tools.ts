import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import * as path from 'path';
import * as fs from 'fs';

export class NexusTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
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
        switch (toolName) {
            case 'nexus_scan_network':
                return this.scanNetwork(args?.domainFilter);
            case 'nexus_query_event':
                return this.queryEvent(args?.eventNameOrUuid);
            case 'nexus_generate_html':
                return this.generateHtml(args?.outputPath);
            default:
                return { success: false, error: `Unknown tool: ${toolName}` };
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
                const nexusBuilderPath = path.join(Editor.Project.path, 'extensions/pts-nexus/dist/engine/NexusGraphBuilder');
                if (fs.existsSync(nexusBuilderPath + '.js')) {
                    const { NexusGraphBuilder } = require(nexusBuilderPath);
                    graph = await NexusGraphBuilder.build(Editor.Project.path);
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
