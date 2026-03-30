import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionManager, PageController } from '@agent_browser/core';

export function registerScreenshotTools(
  server: McpServer,
  sessionManager: SessionManager,
): void {
  server.registerTool(
    'screenshot',
    {
      title: 'Take Screenshot',
      description:
        'Take a screenshot of the current page or a specific element. Returns a base64-encoded image.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        fullPage: z.boolean().optional().describe('Capture the full scrollable page. Defaults to false.'),
        selector: z.string().optional().describe('CSS selector of element to screenshot. Omit for full viewport.'),
        type: z.enum(['png', 'jpeg', 'webp']).optional().describe('Image format. Defaults to png.'),
        quality: z.number().min(0).max(100).optional().describe('Image quality (jpeg/webp only). 0-100.'),
      },
    },
    async ({ sessionId, fullPage, selector, type: imgType, quality }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const result = await controller.screenshot({
        fullPage,
        selector,
        type: imgType,
        quality,
      });

      return {
        content: [
          {
            type: 'image' as const,
            data: result.data,
            mimeType: result.mimeType,
          },
        ],
      };
    },
  );
}
