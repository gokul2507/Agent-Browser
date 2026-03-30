import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionManager, PageController } from '@agent_browser/core';

export function registerJavascriptTools(
  server: McpServer,
  sessionManager: SessionManager,
): void {
  server.registerTool(
    'execute_js',
    {
      title: 'Execute JavaScript',
      description:
        'Execute JavaScript in the browser page context. Supports arrow functions like "() => document.title" or raw expressions like "2 + 2". Returns the result or error.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        expression: z
          .string()
          .describe('JavaScript expression to evaluate. E.g., "() => document.title" or "1 + 1"'),
      },
    },
    async ({ sessionId, expression }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const result = await controller.executeJs({ expression });

      if (result.error) {
        return {
          content: [{ type: 'text', text: `Error: ${result.error}` }],
          isError: true,
        };
      }

      const text =
        typeof result.result === 'string'
          ? result.result
          : JSON.stringify(result.result, null, 2);

      return {
        content: [{ type: 'text', text }],
      };
    },
  );
}
