import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { HeadlessEditTools, HeadlessChainOp } from './headless-edit-tools';

declare const Editor: any;

export class BatchTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'execute',
                description: 'ATOMIC BATCH EXECUTION: Run multiple MCP tool operations sequentially in a single in-process IPC transaction. Minimizes round-trip overhead and supports stopping on errors and auto-saving.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        operations: {
                            type: 'array',
                            description: 'Array of tool operations to execute: [{ tool: string, args: object }]. Examples: [{"tool": "node_node_transform", "args": {"nodeUuid": "...", "position": {"x": 10}}}, {"tool": "component_set_component_property", "args": {"nodeUuid": "...", "componentType": "...", "property": "active", "value": true}}]',
                            items: {
                                type: 'object',
                                properties: {
                                    tool: { type: 'string' },
                                    args: { type: 'object' }
                                },
                                required: ['tool', 'args']
                            }
                        },
                        stopOnError: {
                            type: 'boolean',
                            default: true,
                            description: 'If true, halts batch execution immediately upon first error.'
                        },
                        autoSave: {
                            type: 'boolean',
                            default: true,
                            description: 'If true, automatically saves the active scene/prefab upon successful batch completion.'
                        }
                    },
                    required: ['operations']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        if (toolName === 'batch_execute' || toolName === 'execute' || toolName === 'editor_batch_execute') {
            return await this.handleBatchExecute(args);
        }
        return {
            success: false,
            error: `Unknown batch tool method: ${toolName}`
        };
    }

    private async handleBatchExecute(args: any): Promise<ToolResponse> {
        const operations = args?.operations;
        const stopOnError = args?.stopOnError !== false;
        const autoSave = args?.autoSave !== false;

        if (!Array.isArray(operations) || operations.length === 0) {
            return {
                success: false,
                error: 'operations array is required and must contain at least 1 operation'
            };
        }

        const targetFile = args?.targetFile || args?.scenePath || args?.prefabPath || args?.file;
        if (targetFile) {
            const chainOps: HeadlessChainOp[] = operations.map((op: any) => {
                if (op.action || op.type || op.op) return op;
                if (op.args) {
                    return {
                        action: op.args.action || op.tool,
                        ...op.args
                    };
                }
                return op;
            });
            return await HeadlessEditTools.getInstance().executeChain({
                targetFile,
                chain: chainOps,
                dryRun: args?.dryRun
            });
        }

        const { MCPServer } = require('../mcp-server');
        const mcp = MCPServer.getInstance ? MCPServer.getInstance() : null;
        if (!mcp) {
            return {
                success: false,
                error: 'MCPServer runtime instance is not available for batch dispatch'
            };
        }

        const results: any[] = [];
        let failed = false;
        let failError: any = null;
        const batchStartTime = Date.now();

        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            const opStart = Date.now();
            try {
                const opResult = await mcp.executeToolCall(op.tool, op.args);
                const isOpSuccess = opResult?.success !== false;

                results.push({
                    index: i,
                    tool: op.tool,
                    success: isOpSuccess,
                    result: opResult,
                    durationMs: Date.now() - opStart
                });

                if (!isOpSuccess && stopOnError) {
                    failed = true;
                    failError = opResult?.error || `Operation ${i} (${op.tool}) reported failure`;
                    break;
                }
            } catch (err: any) {
                results.push({
                    index: i,
                    tool: op.tool,
                    success: false,
                    error: err.message || String(err),
                    durationMs: Date.now() - opStart
                });

                if (stopOnError) {
                    failed = true;
                    failError = err.message || String(err);
                    break;
                }
            }
        }

        let saved = false;
        if (!failed && autoSave && typeof Editor !== 'undefined' && Editor.Message) {
            try {
                await Editor.Message.request('scene', 'save-scene');
                saved = true;
            } catch (saveErr) {
                console.warn('[BatchTools] Auto-save scene warning:', saveErr);
            }
        }

        return {
            success: !failed,
            error: failError,
            message: !failed
                ? `Executed ${results.length} operation(s) in ${Date.now() - batchStartTime}ms${saved ? ' and saved scene' : ''}`
                : `Batch execution stopped at step ${results.length - 1}: ${failError}`,
            data: {
                totalOperations: operations.length,
                executedCount: results.length,
                durationTotalMs: Date.now() - batchStartTime,
                autoSaved: saved,
                results
            }
        };
    }
}
