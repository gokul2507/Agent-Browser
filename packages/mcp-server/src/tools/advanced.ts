import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionManager, PageController, listTabs, switchTab, openNewTab, closeTab, saveToFile, saveJsonToFile, wait, runScript } from '@agent_browser/core';

export function registerAdvancedTools(
  server: McpServer,
  sessionManager: SessionManager,
): void {

  // ── Hover ──

  server.registerTool(
    'hover',
    {
      title: 'Hover Element',
      description: 'Hover over an element by CSS selector. Triggers hover effects, tooltips, and dropdown menus.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        selector: z.string().describe('CSS selector of the element to hover'),
        timeout: z.number().optional().describe('Max wait time in ms. Defaults to 30000.'),
      },
    },
    async ({ sessionId, selector, timeout }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.hover(selector, timeout);
      return { content: [{ type: 'text', text: `Hovered: ${selector}` }] };
    },
  );

  // ── Viewport Resize ──

  server.registerTool(
    'resize_viewport',
    {
      title: 'Resize Viewport',
      description: 'Resize the browser viewport. Useful for testing responsive layouts, mobile views, or ensuring elements are visible at specific screen sizes.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        width: z.number().describe('Viewport width in pixels'),
        height: z.number().describe('Viewport height in pixels'),
        deviceScaleFactor: z.number().optional().describe('Device pixel ratio. Defaults to 1. Use 2 for retina.'),
        isMobile: z.boolean().optional().describe('Emulate mobile viewport. Defaults to false.'),
        hasTouch: z.boolean().optional().describe('Enable touch events. Defaults to false.'),
      },
    },
    async ({ sessionId, width, height, deviceScaleFactor, isMobile, hasTouch }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.setViewport({ width, height, deviceScaleFactor, isMobile, hasTouch });
      return {
        content: [{ type: 'text', text: `Viewport resized to ${width}x${height}${isMobile ? ' (mobile)' : ''}` }],
      };
    },
  );

  server.registerTool(
    'get_viewport',
    {
      title: 'Get Viewport Size',
      description: 'Get the current viewport dimensions.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const viewport = await controller.getViewport();
      return { content: [{ type: 'text', text: JSON.stringify(viewport, null, 2) }] };
    },
  );

  // ── Console Messages ──

  server.registerTool(
    'start_console_capture',
    {
      title: 'Start Console Capture',
      description: 'Start capturing browser console messages (log, info, warn, error, debug). Must be started before the messages you want to capture occur. Use get_console_messages to retrieve them.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      controller.startConsoleCapture();
      return { content: [{ type: 'text', text: 'Console capture started. Use get_console_messages to retrieve.' }] };
    },
  );

  server.registerTool(
    'get_console_messages',
    {
      title: 'Get Console Messages',
      description: 'Retrieve captured browser console messages. Filter by level (log, info, warn, error). Optionally clear after reading.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        level: z.enum(['log', 'info', 'warn', 'error', 'debug', 'trace']).optional().describe('Filter by message level'),
        clear: z.boolean().optional().describe('Clear messages after reading. Defaults to false.'),
      },
    },
    async ({ sessionId, level, clear }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const messages = controller.getConsoleMessages({ level, clear });
      return { content: [{ type: 'text', text: JSON.stringify(messages, null, 2) }] };
    },
  );

  // ── Network Requests ──

  server.registerTool(
    'start_network_capture',
    {
      title: 'Start Network Capture',
      description: 'Start capturing all network requests (XHR, fetch, scripts, images, etc.). Must be started before navigation or actions. Use get_network_requests to inspect captured traffic.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      controller.startNetworkCapture();
      return { content: [{ type: 'text', text: 'Network capture started. Use get_network_requests to inspect traffic.' }] };
    },
  );

  server.registerTool(
    'get_network_requests',
    {
      title: 'Get Network Requests',
      description: 'Retrieve captured network requests with filtering. Shows URL, method, status, headers, timing, and failures. Use excludeStatic=true to hide images/fonts/CSS.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        urlPattern: z.string().optional().describe('Regex pattern to filter by URL (e.g., "api\\\\.example\\\\.com")'),
        resourceType: z.string().optional().describe('Filter by type: xhr, fetch, document, script, stylesheet, image, font, etc.'),
        method: z.string().optional().describe('Filter by HTTP method: GET, POST, PUT, DELETE, etc.'),
        statusCode: z.number().optional().describe('Filter by exact status code (e.g., 404, 500)'),
        failed: z.boolean().optional().describe('If true, only show failed requests'),
        excludeStatic: z.boolean().optional().describe('If true, exclude images, fonts, CSS, and media. Defaults to false.'),
      },
    },
    async ({ sessionId, urlPattern, resourceType, method, statusCode, failed, excludeStatic }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const requests = controller.getNetworkRequests({
        urlPattern, resourceType, method, statusCode, failed, excludeStatic,
      });
      return { content: [{ type: 'text', text: JSON.stringify(requests, null, 2) }] };
    },
  );

  // ── Dialog Handling ──

  server.registerTool(
    'setup_dialog_handler',
    {
      title: 'Setup Dialog Handler',
      description: 'Configure how browser dialogs (alert, confirm, prompt) are handled. By default dialogs are dismissed. Set to "accept" to auto-accept. For prompt dialogs, provide promptText. Must be set up before a dialog appears.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        action: z.enum(['accept', 'dismiss']).describe('How to handle dialogs: accept or dismiss'),
        promptText: z.string().optional().describe('Text to enter for prompt dialogs (only used with action=accept)'),
      },
    },
    async ({ sessionId, action, promptText }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      controller.setupDialogHandler(action, promptText);
      return { content: [{ type: 'text', text: `Dialog handler set to "${action}"${promptText ? ` with text "${promptText}"` : ''}` }] };
    },
  );

  server.registerTool(
    'get_dialogs',
    {
      title: 'Get Dialog History',
      description: 'Get a list of all dialogs that appeared since the handler was set up. Shows type (alert/confirm/prompt), message, and default value.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const dialogs = controller.getDialogs();
      return { content: [{ type: 'text', text: JSON.stringify(dialogs, null, 2) }] };
    },
  );

  // ── File Upload ──

  server.registerTool(
    'upload_file',
    {
      title: 'Upload File',
      description: 'Upload one or more files to a file input element. The selector should point to an <input type="file"> element. Provide absolute file paths.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        selector: z.string().describe('CSS selector of the <input type="file"> element'),
        filePaths: z.array(z.string()).describe('Array of absolute file paths to upload'),
        timeout: z.number().optional().describe('Max wait time in ms. Defaults to 30000.'),
      },
    },
    async ({ sessionId, selector, filePaths, timeout }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.uploadFile({ selector, filePaths, timeout });
      return {
        content: [{ type: 'text', text: `Uploaded ${filePaths.length} file(s) to "${selector}": ${filePaths.join(', ')}` }],
      };
    },
  );

  // ── Accessibility Snapshot ──

  server.registerTool(
    'get_accessibility_snapshot',
    {
      title: 'Get Accessibility Snapshot',
      description:
        'Get the accessibility tree of the page. More structured than screenshots — shows the semantic structure (roles, names, values, states) that screen readers see. ' +
        'Great for understanding page state without visual rendering. Set interestingOnly=false to include all nodes.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        interestingOnly: z.boolean().optional().describe('If true (default), only show interesting nodes (with roles/names). Set false for full tree.'),
        root: z.string().optional().describe('CSS selector of root element. Omit for full page.'),
      },
    },
    async ({ sessionId, interestingOnly, root }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const snapshot = await controller.getAccessibilitySnapshot({ interestingOnly, root });
      return { content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }] };
    },
  );

  // ── Tab Management ──

  server.registerTool(
    'list_tabs',
    {
      title: 'List Browser Tabs',
      description: 'List all open tabs in the browser session with their index, URL, and title.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
      },
    },
    async ({ sessionId }) => {
      const session = sessionManager.getSession(sessionId);
      const tabs = await listTabs(session.browser);
      return { content: [{ type: 'text', text: JSON.stringify(tabs, null, 2) }] };
    },
  );

  server.registerTool(
    'switch_tab',
    {
      title: 'Switch Tab',
      description: 'Switch to a different browser tab by index. Use list_tabs to see available tabs.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        index: z.number().describe('Tab index (0-based)'),
      },
    },
    async ({ sessionId, index }) => {
      const session = sessionManager.getSession(sessionId);
      const page = await switchTab(session.browser, index);
      session.pages.set('default', page);
      return {
        content: [{ type: 'text', text: `Switched to tab ${index}: ${page.url()}` }],
      };
    },
  );

  server.registerTool(
    'open_new_tab',
    {
      title: 'Open New Tab',
      description: 'Open a new browser tab, optionally navigating to a URL. The new tab becomes the active tab.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        url: z.string().optional().describe('URL to navigate to in the new tab'),
      },
    },
    async ({ sessionId, url }) => {
      const session = sessionManager.getSession(sessionId);
      const { page, index } = await openNewTab(session.browser, url);
      session.pages.set('default', page);
      return {
        content: [{ type: 'text', text: `Opened new tab at index ${index}${url ? `: ${url}` : ''}` }],
      };
    },
  );

  server.registerTool(
    'close_tab',
    {
      title: 'Close Tab',
      description: 'Close a browser tab by index. Cannot close the last remaining tab. Use list_tabs to see available tabs.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        index: z.number().describe('Tab index to close (0-based)'),
      },
    },
    async ({ sessionId, index }) => {
      const session = sessionManager.getSession(sessionId);
      await closeTab(session.browser, index);
      // Update default page to the first remaining tab
      const pages = await session.browser.pages();
      if (pages.length > 0) {
        session.pages.set('default', pages[0]);
      }
      return { content: [{ type: 'text', text: `Closed tab ${index}` }] };
    },
  );

  // ── Wait for Text Gone ──

  server.registerTool(
    'wait_for_text_gone',
    {
      title: 'Wait for Text to Disappear',
      description:
        'Wait until specific text is no longer visible on the page. Useful for waiting for loading spinners, "Please wait..." messages, or progress indicators to vanish.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        text: z.string().describe('The text to wait for disappearing'),
        timeout: z.number().optional().describe('Max wait time in ms. Defaults to 30000.'),
      },
    },
    async ({ sessionId, text, timeout }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.waitForTextGone(text, timeout);
      return {
        content: [{ type: 'text', text: `Text "${text}" has disappeared` }],
      };
    },
  );

  // ── Element-Scoped JS ──

  server.registerTool(
    'evaluate_on_element',
    {
      title: 'Evaluate JS on Element',
      description:
        'Execute JavaScript scoped to a specific DOM element. The expression receives the element as "el". Example: "(el) => el.textContent" or "(el) => el.getBoundingClientRect()".',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        selector: z.string().describe('CSS selector of the target element'),
        expression: z.string().describe('JS arrow function receiving the element. E.g., "(el) => el.textContent"'),
      },
    },
    async ({ sessionId, selector, expression }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const result = await controller.evaluateOnElement(selector, expression);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    },
  );

  // ── Save to File (on screenshot/console/network) ──

  server.registerTool(
    'save_screenshot_to_file',
    {
      title: 'Save Screenshot to File',
      description: 'Take a screenshot and save it directly to a local file.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        filePath: z.string().describe('Absolute path to save the screenshot'),
        fullPage: z.boolean().optional().describe('Capture full scrollable page. Defaults to false.'),
        type: z.enum(['png', 'jpeg', 'webp']).optional().describe('Image format. Defaults to png.'),
        quality: z.number().min(0).max(100).optional().describe('Quality for jpeg/webp. 0-100.'),
      },
    },
    async ({ sessionId, filePath, fullPage, type: imgType, quality }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const result = await controller.screenshot({ fullPage, type: imgType, quality });
      const buffer = Buffer.from(result.data, 'base64');
      const { writeFileSync } = await import('node:fs');
      writeFileSync(filePath, buffer);
      return { content: [{ type: 'text', text: `Screenshot saved to ${filePath}` }] };
    },
  );

  server.registerTool(
    'save_console_to_file',
    {
      title: 'Save Console Messages to File',
      description: 'Save captured console messages to a JSON file.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        filePath: z.string().describe('Absolute path to save the JSON file'),
        level: z.enum(['log', 'info', 'warn', 'error', 'debug', 'trace']).optional().describe('Filter by level'),
      },
    },
    async ({ sessionId, filePath, level }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const messages = controller.getConsoleMessages({ level });
      saveJsonToFile(messages, filePath);
      return { content: [{ type: 'text', text: `Saved ${messages.length} console messages to ${filePath}` }] };
    },
  );

  server.registerTool(
    'save_network_to_file',
    {
      title: 'Save Network Requests to File',
      description: 'Save captured network requests to a JSON file.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        filePath: z.string().describe('Absolute path to save the JSON file'),
        excludeStatic: z.boolean().optional().describe('Exclude images/fonts/CSS. Defaults to false.'),
      },
    },
    async ({ sessionId, filePath, excludeStatic }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const requests = controller.getNetworkRequests({ excludeStatic });
      saveJsonToFile(requests, filePath);
      return { content: [{ type: 'text', text: `Saved ${requests.length} network requests to ${filePath}` }] };
    },
  );

  server.registerTool(
    'save_accessibility_to_file',
    {
      title: 'Save Accessibility Snapshot to File',
      description: 'Save the accessibility tree to a JSON file.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        filePath: z.string().describe('Absolute path to save the JSON file'),
        interestingOnly: z.boolean().optional().describe('Only interesting nodes. Defaults to true.'),
      },
    },
    async ({ sessionId, filePath, interestingOnly }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      const snapshot = await controller.getAccessibilitySnapshot({ interestingOnly });
      saveJsonToFile(snapshot, filePath);
      return { content: [{ type: 'text', text: `Accessibility snapshot saved to ${filePath}` }] };
    },
  );

  // ── Batch Form Fill ──

  server.registerTool(
    'batch_fill_form',
    {
      title: 'Batch Fill Form',
      description:
        'Fill multiple form fields in a single call. Supports text inputs, checkboxes, radio buttons, select dropdowns, combobox (autocomplete), and range sliders. Use force=true for shadow DOM / custom components.',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        fields: z.array(z.object({
          selector: z.string().describe('CSS selector of the field'),
          value: z.string().describe('Value to set. For checkboxes use "true"/"false". For sliders use numeric string.'),
          type: z.enum(['text', 'checkbox', 'radio', 'select', 'combobox', 'slider']).optional().describe('Field type. Defaults to text.'),
          force: z.boolean().optional().describe('Use JS injection for shadow DOM. Defaults to false.'),
        })).describe('Array of fields to fill'),
      },
    },
    async ({ sessionId, fields }) => {
      const page = await sessionManager.getOrCreatePage(sessionId);
      const controller = new PageController(page);
      await controller.batchFill(fields);
      return { content: [{ type: 'text', text: `Filled ${fields.length} form fields` }] };
    },
  );

  // ── Wait (Sleep) ──

  server.registerTool(
    'wait',
    {
      title: 'Wait',
      description: 'Wait for a specified number of milliseconds. Simple time-based delay. Use between actions when you need a pause.',
      inputSchema: {
        ms: z.number().describe('Milliseconds to wait'),
      },
    },
    async ({ ms }) => {
      await wait(ms);
      return { content: [{ type: 'text', text: `Waited ${ms}ms` }] };
    },
  );

  // ── Run Script (Escape Hatch) ──

  server.registerTool(
    'run_script',
    {
      title: 'Run Puppeteer Script',
      description:
        'Execute raw Puppeteer code against the browser. The script receives `page` (Puppeteer Page) and `browser` (Puppeteer Browser) as variables. ' +
        'This is the escape hatch for anything not covered by other tools. Return a value from the script to get it as the result. ' +
        'Example: "const title = await page.title(); return title;"',
      inputSchema: {
        sessionId: z.string().describe('The session ID'),
        code: z.string().describe('Puppeteer code to execute. Has access to `page` and `browser` variables. Use `return` to return a value.'),
      },
    },
    async ({ sessionId, code }) => {
      const session = sessionManager.getSession(sessionId);
      const page = await sessionManager.getOrCreatePage(sessionId);
      try {
        const result = await runScript(page, session.browser, code);
        const text = result === undefined ? 'Script executed (no return value)'
          : typeof result === 'string' ? result
          : JSON.stringify(result, null, 2);
        return { content: [{ type: 'text', text }] };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Script error: ${err?.message ?? String(err)}` }],
          isError: true,
        };
      }
    },
  );
}
