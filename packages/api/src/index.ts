import { buildApp, type AppConfig } from './app.js';

export { buildApp, type AppConfig };

const config: AppConfig = {
  host: process.env.API_HOST ?? '127.0.0.1',
  port: Number(process.env.API_PORT ?? 3000),
  browser: {
    host: process.env.LIGHTPANDA_HOST ?? '127.0.0.1',
    port: Number(process.env.LIGHTPANDA_PORT ?? 9222),
  },
  chromium: {
    headless: process.env.CHROMIUM_HEADLESS !== 'false',
    executablePath: process.env.CHROMIUM_PATH || undefined,
  },
  session: {
    defaultEngine: (process.env.DEFAULT_ENGINE as 'lightpanda' | 'chromium' | 'auto') ?? 'lightpanda',
  },
  apiKey: process.env.API_KEY || undefined,
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  },
  logLevel: process.env.LOG_LEVEL ?? 'info',
};

const app = await buildApp(config);

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
