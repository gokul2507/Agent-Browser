import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionManager, type BrowserConfig, type SessionManagerConfig } from '@agent_browser/core';
import { registerSessionTools } from './tools/sessions.js';
import { registerNavigateTools } from './tools/navigate.js';
import { registerContentTools } from './tools/content.js';
import { registerActionTools } from './tools/actions.js';
import { registerJavascriptTools } from './tools/javascript.js';
import { registerScreenshotTools } from './tools/screenshots.js';
import { registerCookieTools } from './tools/cookies.js';
import { registerSpaTools } from './tools/spa.js';
import { registerAdvancedTools } from './tools/advanced.js';

export interface McpBrowserConfig {
  browser?: Partial<BrowserConfig>;
  session?: Partial<SessionManagerConfig>;
}

export function createServer(config: McpBrowserConfig = {}): {
  server: McpServer;
  sessionManager: SessionManager;
} {
  const server = new McpServer({
    name: 'ai-browser',
    version: '0.2.9',
  });

  const sessionManager = new SessionManager(config.browser, config.session);

  // Register all tools
  registerSessionTools(server, sessionManager);
  registerNavigateTools(server, sessionManager);
  registerContentTools(server, sessionManager);
  registerActionTools(server, sessionManager);
  registerJavascriptTools(server, sessionManager);
  registerScreenshotTools(server, sessionManager);
  registerCookieTools(server, sessionManager);
  registerSpaTools(server, sessionManager);
  registerAdvancedTools(server, sessionManager);

  return { server, sessionManager };
}
