import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { SessionManager, type BrowserConfig, type ChromiumConfig, type SessionManagerConfig } from '@agent_browser/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { sessionRoutes } from './routes/sessions.js';
import { navigateRoutes } from './routes/navigate.js';
import { contentRoutes } from './routes/content.js';
import { actionRoutes } from './routes/actions.js';
import { javascriptRoutes } from './routes/javascript.js';
import { cookieRoutes } from './routes/cookies.js';
import { screenshotRoutes } from './routes/screenshots.js';
import { advancedRoutes } from './routes/advanced.js';
import { errorHandler } from './middleware/error-handler.js';
import { createAuthHook } from './middleware/auth.js';
import { registerRateLimit } from './middleware/rate-limit.js';

export interface AppConfig {
  host?: string;
  port?: number;
  browser?: Partial<BrowserConfig>;
  chromium?: Partial<ChromiumConfig>;
  session?: Partial<SessionManagerConfig>;
  /** Pass an existing SessionManager to share state with MCP or other processes */
  sessionManager?: SessionManager;
  apiKey?: string;
  rateLimit?: {
    max?: number;
    windowMs?: number;
  };
  logLevel?: string;
}

export async function buildApp(config: AppConfig = {}): Promise<FastifyInstance> {
  const logLevel = config.logLevel ?? 'info';
  const app = Fastify({
    logger: logLevel === 'silent'
      ? false
      : { level: logLevel, stream: process.stderr },
  });

  await app.register(cors, { origin: true });

  // API key authentication (optional — only active if API_KEY is set)
  const authHook = createAuthHook(config.apiKey);
  if (authHook) {
    app.addHook('onRequest', authHook);
    app.log.info('API key authentication enabled');
  }

  // Rate limiting
  registerRateLimit(app, {
    max: config.rateLimit?.max ?? 100,
    windowMs: config.rateLimit?.windowMs ?? 60_000,
  });

  // Request logging
  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      { method: request.method, url: request.url, statusCode: reply.statusCode, responseTime: reply.elapsedTime },
      'request completed',
    );
  });

  // Use existing SessionManager if provided (shared with MCP), otherwise create new
  const sessionManager = config.sessionManager ?? new SessionManager(config.browser, config.session, config.chromium);
  const ownsSessionManager = !config.sessionManager;
  if (ownsSessionManager && !sessionManager['engines']?.size) {
    await sessionManager.start();
  }

  app.decorate('sessionManager', sessionManager);

  // Error handler
  app.setErrorHandler(errorHandler);

  // Register routes
  await app.register(sessionRoutes, { prefix: '/sessions' });
  await app.register(navigateRoutes, { prefix: '/sessions' });
  await app.register(contentRoutes, { prefix: '/sessions' });
  await app.register(actionRoutes, { prefix: '/sessions' });
  await app.register(javascriptRoutes, { prefix: '/sessions' });
  await app.register(cookieRoutes, { prefix: '/sessions' });
  await app.register(screenshotRoutes, { prefix: '/sessions' });
  await app.register(advancedRoutes, { prefix: '/sessions' });

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  // Dashboard
  const dashboardHtml = readFileSync(join(__dirname, 'dashboard.html'), 'utf-8');
  app.get('/dashboard', async (_request, reply) => {
    reply.type('text/html').send(dashboardHtml);
  });

  // Graceful shutdown — only stop session manager if we created it
  if (ownsSessionManager) {
    app.addHook('onClose', async () => {
      await sessionManager.stop();
    });
  }

  return app;
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    sessionManager: SessionManager;
  }
}
