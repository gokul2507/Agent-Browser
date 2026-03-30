import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionManager, PageController } from '@ai-browser/core';

export function registerActionTools(
  server: McpServer,
  sessionManager: SessionManager,
): void {
  server.registerTool(
    'click',
    {
      title: 'Click Element',
      description:
        'Click an element on the page by CSS selector. Waits for the element to appear before clicking.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        selector: z.string().describe('CSS selector of the element to click (e.g., "button.submit", "#login-btn", "a[href=\'/about\']")'),
        timeout: z.number().optional().describe('Max wait time in ms for element to appear. Defaults to 30000.'),
      },
    },
    async ({ sessionId, selector, timeout }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.click({ selector, timeout });
      return {
        content: [{ type: 'text', text: `Clicked: ${selector}` }],
      };
    },
  );

  server.registerTool(
    'fill',
    {
      title: 'Fill Input',
      description:
        'Clear an input field and fill it with a new value. Use this for form inputs, search boxes, etc.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        selector: z.string().describe('CSS selector of the input element'),
        value: z.string().describe('The value to fill in'),
        timeout: z.number().optional().describe('Max wait time in ms'),
      },
    },
    async ({ sessionId, selector, value, timeout }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.fill({ selector, value, timeout });
      return {
        content: [{ type: 'text', text: `Filled "${selector}" with "${value}"` }],
      };
    },
  );

  server.registerTool(
    'type_text',
    {
      title: 'Type Text',
      description:
        'Type text into an element character by character. Unlike fill, this preserves existing content and simulates real keystrokes. Use for autocomplete or search-as-you-type inputs.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        selector: z.string().describe('CSS selector of the input element'),
        text: z.string().describe('The text to type'),
        delay: z.number().optional().describe('Delay between keystrokes in ms'),
        timeout: z.number().optional().describe('Max wait time in ms'),
      },
    },
    async ({ sessionId, selector, text, delay, timeout }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.type({ selector, text, delay, timeout });
      return {
        content: [{ type: 'text', text: `Typed "${text}" into "${selector}"` }],
      };
    },
  );

  server.registerTool(
    'select_option',
    {
      title: 'Select Option',
      description: 'Select one or more options in a <select> dropdown by value.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        selector: z.string().describe('CSS selector of the <select> element'),
        values: z.array(z.string()).describe('Option values to select'),
        timeout: z.number().optional().describe('Max wait time in ms'),
      },
    },
    async ({ sessionId, selector, values, timeout }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const selected = await controller.select({ selector, values, timeout });
      return {
        content: [
          { type: 'text', text: `Selected [${selected.join(', ')}] in "${selector}"` },
        ],
      };
    },
  );

  server.registerTool(
    'scroll',
    {
      title: 'Scroll Page',
      description: 'Scroll the page or a specific element up or down.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        direction: z.enum(['up', 'down']).optional().describe('Scroll direction. Defaults to down.'),
        amount: z.number().optional().describe('Pixels to scroll. Defaults to 500.'),
        selector: z.string().optional().describe('CSS selector of element to scroll. Omit to scroll the page.'),
      },
    },
    async ({ sessionId, direction, amount, selector }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.scroll({ direction, amount, selector });
      return {
        content: [
          {
            type: 'text',
            text: `Scrolled ${direction ?? 'down'} by ${amount ?? 500}px${selector ? ` in "${selector}"` : ''}`,
          },
        ],
      };
    },
  );
}
