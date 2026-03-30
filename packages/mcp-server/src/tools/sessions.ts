import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SessionManager, EngineType } from '@ai-browser/core';

export function registerSessionTools(
  server: McpServer,
  sessionManager: SessionManager,
): void {
  server.registerTool(
    'create_session',
    {
      title: 'Create Browser Session',
      description:
        'Create a new browser session. Returns a session ID to use with other tools. Each session is an isolated browser context with its own cookies and state.\n\n' +
        'Engine options:\n' +
        '- "lightpanda" (default): Fast, lightweight. Best for simple/medium pages, scraping, docs.\n' +
        '- "chromium": Full Chrome browser. Use for heavy SPAs (Zoho, Salesforce, Google apps), OAuth flows, complex JS.\n' +
        '- "auto": Tries lightpanda first, falls back to chromium on failure.',
      inputSchema: {
        engine: z
          .enum(['lightpanda', 'chromium', 'auto'])
          .optional()
          .describe('Browser engine to use. Defaults to lightpanda. Use "chromium" for heavy SPAs.'),
      },
    },
    async ({ engine }) => {
      const session = await sessionManager.createSession(engine as EngineType | undefined);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(session, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'list_sessions',
    {
      title: 'List Browser Sessions',
      description: 'List all active browser sessions with their IDs, engine type, and current URLs.',
      inputSchema: {},
    },
    async () => {
      const sessions = sessionManager.listSessions();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ sessions }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'destroy_session',
    {
      title: 'Destroy Browser Session',
      description: 'Destroy a browser session and release its resources.',
      inputSchema: {
        sessionId: z.string().describe('The session ID to destroy'),
      },
    },
    async ({ sessionId }) => {
      await sessionManager.destroySession(sessionId);
      return {
        content: [
          {
            type: 'text',
            text: `Session ${sessionId} destroyed.`,
          },
        ],
      };
    },
  );
}
