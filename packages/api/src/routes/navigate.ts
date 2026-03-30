import type { FastifyInstance } from 'fastify';
import { PageController, type NavigateOptions } from '@agent_browser/core';

interface NavigateBody {
  url: string;
  waitUntil?: NavigateOptions['waitUntil'];
  timeout?: number;
}

export async function navigateRoutes(app: FastifyInstance): Promise<void> {
  // Navigate to a URL
  app.post<{ Params: { id: string }; Body: NavigateBody }>(
    '/:id/navigate',
    async (request) => {
      const { url, waitUntil, timeout } = request.body;
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      const result = await controller.navigate(url, { waitUntil, timeout });
      return { result };
    },
  );

  // Go back
  app.post<{ Params: { id: string } }>('/:id/back', async (request) => {
    const page = await app.sessionManager.getOrCreatePage(request.params.id);
    const controller = new PageController(page);
    const result = await controller.goBack();
    return { result };
  });

  // Go forward
  app.post<{ Params: { id: string } }>('/:id/forward', async (request) => {
    const page = await app.sessionManager.getOrCreatePage(request.params.id);
    const controller = new PageController(page);
    const result = await controller.goForward();
    return { result };
  });

  // Reload
  app.post<{ Params: { id: string } }>('/:id/reload', async (request) => {
    const page = await app.sessionManager.getOrCreatePage(request.params.id);
    const controller = new PageController(page);
    const result = await controller.reload();
    return { result };
  });
}
