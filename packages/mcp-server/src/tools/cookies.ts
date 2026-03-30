import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  SessionManager,
  PageController,
  loadCookiesFromFile,
  importCookiesFromJson,
  importCookiesFromNetscape,
  injectCookiesIntoPage,
  extractCookiesFromPage,
  exportCookiesToJson,
  saveCookiesToFile,
} from '@anthropic-ai-browser/core';

export function registerCookieTools(
  server: McpServer,
  sessionManager: SessionManager,
): void {
  server.registerTool(
    'import_cookies_from_file',
    {
      title: 'Import Cookies from File',
      description:
        'Import cookies from a local file into the browser session. Supports JSON format (from browser extensions like "EditThisCookie") and Netscape cookie.txt format (from curl, wget). The format is auto-detected. This lets the agent use an authenticated session without knowing the password.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        filePath: z.string().describe('Absolute path to the cookie file (JSON or Netscape format)'),
      },
    },
    async ({ sessionId, filePath }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const cookies = loadCookiesFromFile(filePath);
      await injectCookiesIntoPage(page, cookies);

      const domains = [...new Set(cookies.map((c) => c.domain).filter(Boolean))];
      return {
        content: [
          {
            type: 'text',
            text: `Imported ${cookies.length} cookies for domains: ${domains.join(', ')}. The session is now authenticated. Navigate to the target site to use the logged-in session.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'import_cookies_from_json',
    {
      title: 'Import Cookies from JSON',
      description:
        'Import cookies from a JSON string directly. Accepts either a raw array of cookie objects or { cookies: [...] } format. Use this when you have cookie data as text rather than a file.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        json: z.string().describe('JSON string containing cookie data'),
      },
    },
    async ({ sessionId, json }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const cookies = importCookiesFromJson(json);
      await injectCookiesIntoPage(page, cookies);

      return {
        content: [
          {
            type: 'text',
            text: `Imported ${cookies.length} cookies. Navigate to the target site to use the authenticated session.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'export_cookies',
    {
      title: 'Export Cookies',
      description:
        'Export all cookies from the current page. Optionally save to a file. Useful for preserving login sessions across browser restarts.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        savePath: z
          .string()
          .optional()
          .describe('Optional file path to save cookies to. If omitted, returns the cookie data as text.'),
        format: z
          .enum(['json', 'netscape'])
          .optional()
          .describe('Export format. Defaults to json.'),
      },
    },
    async ({ sessionId, savePath, format = 'json' }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const cookies = await extractCookiesFromPage(page);

      if (savePath) {
        saveCookiesToFile(cookies, savePath, format);
        return {
          content: [
            {
              type: 'text',
              text: `Exported ${cookies.length} cookies to ${savePath} (${format} format).`,
            },
          ],
        };
      }

      const data = exportCookiesToJson(cookies);
      return {
        content: [{ type: 'text', text: data }],
      };
    },
  );

  server.registerTool(
    'get_cookies',
    {
      title: 'Get Cookies',
      description: 'Get all cookies for the current page as a JSON list.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const cookies = await controller.getCookies();
      return {
        content: [{ type: 'text', text: JSON.stringify(cookies, null, 2) }],
      };
    },
  );

  server.registerTool(
    'clear_cookies',
    {
      title: 'Clear Cookies',
      description: 'Clear all cookies for the current page.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.clearCookies();
      return {
        content: [{ type: 'text', text: 'All cookies cleared.' }],
      };
    },
  );
}
