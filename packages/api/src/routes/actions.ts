import type { FastifyInstance } from 'fastify';
import { PageController } from '@anthropic-ai-browser/core';

interface ClickBody {
  selector: string;
  timeout?: number;
}

interface FillBody {
  selector: string;
  value: string;
  timeout?: number;
}

interface TypeBody {
  selector: string;
  text: string;
  delay?: number;
  timeout?: number;
}

interface SelectBody {
  selector: string;
  values: string[];
  timeout?: number;
}

interface ScrollBody {
  direction?: 'up' | 'down';
  amount?: number;
  selector?: string;
}

export async function actionRoutes(app: FastifyInstance): Promise<void> {
  // Click an element
  app.post<{ Params: { id: string }; Body: ClickBody }>(
    '/:id/click',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.click(request.body);
      return { success: true };
    },
  );

  // Fill an input
  app.post<{ Params: { id: string }; Body: FillBody }>(
    '/:id/fill',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.fill(request.body);
      return { success: true };
    },
  );

  // Type text
  app.post<{ Params: { id: string }; Body: TypeBody }>(
    '/:id/type',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.type(request.body);
      return { success: true };
    },
  );

  // Select option
  app.post<{ Params: { id: string }; Body: SelectBody }>(
    '/:id/select',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      const selected = await controller.select(request.body);
      return { selected };
    },
  );

  // Scroll
  app.post<{ Params: { id: string }; Body: ScrollBody }>(
    '/:id/scroll',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.scroll(request.body);
      return { success: true };
    },
  );

  // Click by text
  app.post<{ Params: { id: string }; Body: { text: string; exact?: boolean } }>(
    '/:id/click-by-text',
    async (request) => {
      const { text, exact } = request.body;
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.clickByText(text, { exact });
      return { success: true };
    },
  );

  // Click at coordinates
  app.post<{ Params: { id: string }; Body: { x: number; y: number } }>(
    '/:id/click-at',
    async (request) => {
      const { x, y } = request.body;
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.clickAtCoordinates(x, y);
      return { success: true };
    },
  );

  // Get interactive elements
  app.get<{ Params: { id: string } }>(
    '/:id/interactive-elements',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      const elements = await controller.getInteractiveElements();
      return { elements };
    },
  );

  // Smart fill (shadow DOM / custom components)
  app.post<{ Params: { id: string }; Body: { selector: string; value: string } }>(
    '/:id/smart-fill',
    async (request) => {
      const { selector, value } = request.body;
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.fill({ selector, value, force: true });
      return { success: true };
    },
  );

  // Wait for selector
  app.post<{ Params: { id: string }; Body: { selector: string; timeout?: number } }>(
    '/:id/wait-for-selector',
    async (request) => {
      const { selector, timeout } = request.body;
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.waitForSelector(selector, timeout);
      return { success: true };
    },
  );

  // Wait for network idle
  app.post<{ Params: { id: string }; Body: { timeout?: number } }>(
    '/:id/wait-for-idle',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.waitForNetworkIdle(request.body?.timeout);
      return { success: true };
    },
  );
}
