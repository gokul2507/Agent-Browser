import type { FastifyReply, FastifyRequest } from 'fastify';

export function createAuthHook(apiKey: string | undefined) {
  // If no API key is configured, skip auth
  if (!apiKey) {
    return undefined;
  }

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check
    if (request.url === '/health') {
      return;
    }

    const provided =
      request.headers.authorization?.replace('Bearer ', '') ??
      (request.headers['x-api-key'] as string | undefined);

    if (!provided || provided !== apiKey) {
      reply.status(401).send({
        error: {
          message: 'Invalid or missing API key. Provide via Authorization: Bearer <key> or X-API-Key header.',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
    }
  };
}
