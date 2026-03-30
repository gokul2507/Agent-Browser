import type { FastifyInstance } from 'fastify';
import { PageController } from '@anthropic-ai-browser/core';

interface ExecuteBody {
  expression: string;
  args?: unknown[];
}

export async function javascriptRoutes(app: FastifyInstance): Promise<void> {
  // Execute JavaScript in the page context
  app.post<{ Params: { id: string }; Body: ExecuteBody }>(
    '/:id/execute',
    async (request) => {
      const { expression, args } = request.body;
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      const result = await controller.executeJs({ expression, args });
      return { result };
    },
  );
}
