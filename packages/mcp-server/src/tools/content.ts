import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionManager, PageController } from '@anthropic-ai-browser/core';

export function registerContentTools(
  server: McpServer,
  sessionManager: SessionManager,
): void {
  server.registerTool(
    'get_content',
    {
      title: 'Get Page Content',
      description:
        'Extract the full structured content from the current page. Returns clean text, metadata, links, tables, and forms as JSON. Best for getting a comprehensive view of the page.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const content = await controller.getContent();
      return {
        content: [{ type: 'text', text: JSON.stringify(content, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_text',
    {
      title: 'Get Page Text',
      description:
        'Extract only the visible text content from the current page. Lighter than get_content when you just need the text.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const text = await controller.getText();
      return {
        content: [{ type: 'text', text }],
      };
    },
  );

  server.registerTool(
    'get_links',
    {
      title: 'Get Page Links',
      description:
        'Extract all links from the current page. Returns an array of {text, href} objects with fully resolved URLs.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const links = await controller.getLinks();
      return {
        content: [{ type: 'text', text: JSON.stringify(links, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_tables',
    {
      title: 'Get Page Tables',
      description:
        'Extract all HTML tables from the current page as structured arrays with headers and rows.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const tables = await controller.getTables();
      return {
        content: [{ type: 'text', text: JSON.stringify(tables, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_metadata',
    {
      title: 'Get Page Metadata',
      description:
        'Extract metadata from the current page (description, author, published date, OpenGraph tags).',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const metadata = await controller.getMetadata();
      return {
        content: [{ type: 'text', text: JSON.stringify(metadata, null, 2) }],
      };
    },
  );
}
