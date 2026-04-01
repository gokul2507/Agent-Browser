#!/usr/bin/env node
import { execSync } from 'node:child_process';
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

// ── Kill any process on our ports before starting ──
const lightpandaPort = Number(process.env.LIGHTPANDA_PORT ?? 9222);
const dashboardPort = Number(process.env.DASHBOARD_PORT ?? 3000);

function killPort(port: number): void {
  try {
    const pids = execSync(`lsof -ti:${port} 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (pids) {
      for (const pid of pids.split('\n')) {
        if (pid && Number(pid) !== process.pid) {
          try { process.kill(Number(pid), 'SIGKILL'); } catch {}
        }
      }
      console.error(`Cleared port ${port}`);
    }
  } catch {}
}

killPort(lightpandaPort);
if (process.env.DASHBOARD === 'true') {
  killPort(dashboardPort);
}

// Also kill any leftover lightpanda processes
try {
  execSync('pkill -f "lightpanda serve" 2>/dev/null', { encoding: 'utf-8' });
} catch {}

const { server, sessionManager } = createServer({
  browser: {
    host: process.env.LIGHTPANDA_HOST ?? '127.0.0.1',
    port: lightpandaPort,
  },
});

// DON'T start Lightpanda eagerly — engines start lazily on first create_session call.

// ── Start MCP over stdio ──
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('AI Browser MCP Server running on stdio');

// ── Start Dashboard (opt-in via DASHBOARD=true env var) ──
if (process.env.DASHBOARD === 'true') {
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
