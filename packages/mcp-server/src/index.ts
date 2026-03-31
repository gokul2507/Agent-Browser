#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

export { createServer, type McpBrowserConfig } from './server.js';

// Prevent uncaught exceptions from crashing the MCP server
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

const { server, sessionManager } = createServer({
  browser: {
    host: process.env.LIGHTPANDA_HOST ?? '127.0.0.1',
    port: Number(process.env.LIGHTPANDA_PORT ?? 9222),
  },
});

// DON'T start Lightpanda eagerly — engines start lazily on first create_session call.
// This means Chromium-only users don't need Lightpanda installed at all.

// ── Start MCP over stdio ──
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('AI Browser MCP Server running on stdio');

// ── Start Dashboard (opt-in via DASHBOARD=true env var) ──
if (process.env.DASHBOARD === 'true') {
  const dashboardPort = Number(process.env.DASHBOARD_PORT ?? 3000);
  setTimeout(async () => {
    try {
      const { buildApp } = await import('@agent_browser/api');
      const app = await buildApp({
        sessionManager,
        logLevel: 'silent',
      });
      await app.listen({ host: '127.0.0.1', port: dashboardPort });
      console.error(`Dashboard running at http://127.0.0.1:${dashboardPort}/dashboard`);
    } catch {
      // Silently skip
    }
  }, 1000);
}

// ── Graceful shutdown ──
process.on('SIGINT', async () => {
  await sessionManager.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await sessionManager.stop();
  process.exit(0);
});
