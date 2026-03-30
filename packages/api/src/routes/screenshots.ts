import type { FastifyInstance } from 'fastify';
import { PageController, type ScreenshotOptions } from '@ai-browser/core';

interface ScreenshotQuery {
  fullPage?: string;
  type?: 'png' | 'jpeg' | 'webp';
  quality?: string;
  selector?: string;
}

export async function screenshotRoutes(app: FastifyInstance): Promise<void> {
  // Take a screenshot
  app.get<{ Params: { id: string }; Querystring: ScreenshotQuery }>(
    '/:id/screenshot',
    async (request) => {
      const { fullPage, type, quality, selector } = request.query;
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);

      const options: ScreenshotOptions = {
        fullPage: fullPage === 'true',
        type: type ?? 'png',
        quality: quality ? Number(quality) : undefined,
        selector,
      };

      const screenshot = await controller.screenshot(options);
      return { screenshot };
    },
  );
}
