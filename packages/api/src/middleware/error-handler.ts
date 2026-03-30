import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  const statusCode = error.statusCode ?? 500;

  reply.status(statusCode).send({
    error: {
      message: error.message,
      code: error.code ?? 'INTERNAL_ERROR',
      statusCode,
    },
  });
}
