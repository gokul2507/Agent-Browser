import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionManager, PageController } from '@anthropic-ai-browser/core';

export function registerNavigateTools(
  server: McpServer,
  sessionManager: SessionManager,
): void {
  server.registerTool(
    'navigate',
    {
      title: 'Navigate to URL',
      description:
        'Navigate to a URL in the browser. Returns the page title, final URL, HTTP status, and load time. Use create_session first to get a session ID.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        url: z.string().url().describe('The URL to navigate to'),
        waitUntil: z
          .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
          .optional()
          .describe('When to consider navigation complete. Defaults to domcontentloaded.'),
      },
    },
    async ({ sessionId, url, waitUntil }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const result = await controller.navigate(url, { waitUntil });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'go_back',
    {
      title: 'Go Back',
      description: 'Navigate back in browser history.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const result = await controller.goBack();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'go_forward',
    {
      title: 'Go Forward',
      description: 'Navigate forward in browser history.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const result = await controller.goForward();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'reload',
    {
      title: 'Reload Page',
      description: 'Reload the current page.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const result = await controller.reload();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
