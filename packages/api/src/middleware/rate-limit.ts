import type { FastifyInstance } from 'fastify';

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

interface ClientEntry {
  count: number;
  resetAt: number;
}

export function registerRateLimit(app: FastifyInstance, config: RateLimitConfig): void {
  const clients = new Map<string, ClientEntry>();

  // Cleanup expired entries periodically
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of clients) {
      if (now > entry.resetAt) {
        clients.delete(key);
      }
    }
  }, config.windowMs);

  app.addHook('onClose', () => clearInterval(cleanup));

  app.addHook('onRequest', async (request, reply) => {
    // Skip rate limiting for health check
    if (request.url === '/health') {
      return;
    }

    const clientId = request.ip;
    const now = Date.now();
    let entry = clients.get(clientId);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + config.windowMs };
      clients.set(clientId, entry);
    }

    entry.count++;

    reply.header('X-RateLimit-Limit', config.max);
    reply.header('X-RateLimit-Remaining', Math.max(0, config.max - entry.count));
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > config.max) {
      reply.status(429).send({
        error: {
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMITED',
          statusCode: 429,
        },
      });
    }
  });
}
