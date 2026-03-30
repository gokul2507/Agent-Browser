import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionManager, PageController } from '@agent_browser/core';

export function registerSpaTools(
  server: McpServer,
  sessionManager: SessionManager,
): void {
  server.registerTool(
    'get_interactive_elements',
    {
      title: 'Get Interactive Elements',
      description:
        'Discover all clickable and interactive elements on the current page. Returns a list with each element\'s index, type (button, link, input, etc.), visible text, CSS selector, and bounding box coordinates. Essential for SPA navigation — use this before clicking to find the right element.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const elements = await controller.getInteractiveElements();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(elements, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'click_by_text',
    {
      title: 'Click by Text',
      description:
        'Click the first visible element containing the specified text. Returns info about what was clicked (tag, selector, bounding box). Works with buttons, links, custom web components. Use exact=true for exact match. Use containerSelector to scope the search (e.g. only inside a modal).',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        text: z.string().describe('The text to search for in clickable elements'),
        exact: z.boolean().optional().describe('If true, match text exactly. If false (default), match partial text.'),
        containerSelector: z.string().optional().describe('CSS selector to scope the search within (e.g. ".modal", "#sidebar"). Omit to search the whole page.'),
      },
    },
    async ({ sessionId, text, exact, containerSelector }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const result = await controller.clickByText(text, { exact, containerSelector });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'click_at_coordinates',
    {
      title: 'Click at Coordinates',
      description:
        'Click at specific x,y page coordinates. Use when CSS selectors and text matching fail. Get coordinates from get_interactive_elements (rect field) or from a screenshot. Coordinates are relative to the viewport top-left.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        x: z.number().describe('X coordinate (pixels from left)'),
        y: z.number().describe('Y coordinate (pixels from top)'),
      },
    },
    async ({ sessionId, x, y }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.clickAtCoordinates(x, y);
      return {
        content: [{ type: 'text', text: `Clicked at (${x}, ${y})` }],
      };
    },
  );

  server.registerTool(
    'smart_fill',
    {
      title: 'Smart Fill Input',
      description:
        'Fill an input field using JS injection — works with shadow DOM, custom web components (lyte-input, etc.), and framework-wrapped inputs where the standard fill tool fails. Triggers input/change/blur events to activate framework reactivity.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        selector: z.string().describe('CSS selector of the input or its wrapper component'),
        value: z.string().describe('The value to set'),
      },
    },
    async ({ sessionId, selector, value }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.fill({ selector, value, force: true });
      return {
        content: [{ type: 'text', text: `Smart-filled "${selector}" with "${value}"` }],
      };
    },
  );

  server.registerTool(
    'wait_for_selector',
    {
      title: 'Wait for Selector',
      description:
        'Wait for an element matching the CSS selector to appear in the DOM. Use after clicks or navigation in SPAs to wait for content to load before extracting.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        selector: z.string().describe('CSS selector to wait for'),
        timeout: z.number().optional().describe('Max wait time in ms. Defaults to 30000.'),
      },
    },
    async ({ sessionId, selector, timeout }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.waitForSelector(selector, timeout);
      return {
        content: [{ type: 'text', text: `Element "${selector}" appeared` }],
      };
    },
  );

  server.registerTool(
    'wait_for_network_idle',
    {
      title: 'Wait for Network Idle',
      description:
        'Wait until the page has no network requests for 500ms. Use after SPA navigation or form submission to ensure the page has finished loading.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        timeout: z.number().optional().describe('Max wait time in ms. Defaults to 30000.'),
      },
    },
    async ({ sessionId, timeout }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.waitForNetworkIdle(timeout);
      return {
        content: [{ type: 'text', text: 'Network is idle' }],
      };
    },
  );

  server.registerTool(
    'drag_and_drop',
    {
      title: 'Drag and Drop',
      description:
        'Drag an element and drop it on another element or at specific coordinates. Essential for builder UIs, kanban boards, reorder lists, and layout editors. Supports both selector-based and coordinate-based dragging.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        fromSelector: z.string().optional().describe('CSS selector of the element to drag'),
        toSelector: z.string().optional().describe('CSS selector of the drop target'),
        fromX: z.number().optional().describe('X coordinate to start dragging from'),
        fromY: z.number().optional().describe('Y coordinate to start dragging from'),
        toX: z.number().optional().describe('X coordinate to drop at'),
        toY: z.number().optional().describe('Y coordinate to drop at'),
        steps: z.number().optional().describe('Number of intermediate mouse move steps (default 10). More steps = smoother drag.'),
      },
    },
    async ({ sessionId, fromSelector, toSelector, fromX, fromY, toX, toY, steps }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.dragAndDrop({ fromSelector, toSelector, fromX, fromY, toX, toY, steps });

      const from = fromSelector ?? `(${fromX}, ${fromY})`;
      const to = toSelector ?? `(${toX}, ${toY})`;
      return {
        content: [{ type: 'text', text: `Dragged from ${from} to ${to}` }],
      };
    },
  );

  server.registerTool(
    'press_key',
    {
      title: 'Press Key',
      description:
        'Press a keyboard key or key combination. Useful for Enter (submit forms), Escape (close modals), Tab (move focus), and shortcuts like Control+A (select all). Key names: Enter, Escape, Tab, Backspace, ArrowDown, ArrowUp, Control+A, Shift+Tab, etc.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        key: z.string().describe('Key to press. Examples: "Enter", "Escape", "Tab", "ArrowDown", "Control+A", "Shift+Tab"'),
      },
    },
    async ({ sessionId, key }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);

      // Handle key combinations like "Control+A"
      if (key.includes('+')) {
        const parts = key.split('+');
        const mainKey = parts.pop()!;
        for (const modifier of parts) {
          await page.keyboard.down(modifier as any);
        }
        await page.keyboard.press(mainKey as any);
        for (const modifier of parts.reverse()) {
          await page.keyboard.up(modifier as any);
        }
      } else {
        await controller.pressKey(key);
      }

      return {
        content: [{ type: 'text', text: `Pressed key: ${key}` }],
      };
    },
  );

  server.registerTool(
    'scroll_to_text',
    {
      title: 'Scroll to Text',
      description:
        'Scroll the page or a container until the specified text becomes visible. Handles nested scrollable containers. Returns whether the text was found. Use when you need to find an element that\'s off-screen.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        text: z.string().describe('The text to scroll to'),
        containerSelector: z.string().optional().describe('CSS selector of the scrollable container. Omit to scroll the main page.'),
        maxScrolls: z.number().optional().describe('Max scroll attempts before giving up. Default 20.'),
      },
    },
    async ({ sessionId, text, containerSelector, maxScrolls }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const found = await controller.scrollToText(text, { containerSelector, maxScrolls });
      return {
        content: [
          {
            type: 'text',
            text: found
              ? `Scrolled to text: "${text}" — now visible`
              : `Text "${text}" not found after scrolling`,
          },
        ],
      };
    },
  );
}
