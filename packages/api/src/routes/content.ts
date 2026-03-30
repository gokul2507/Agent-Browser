import type { FastifyInstance } from 'fastify';
import { PageController } from '@anthropic-ai-browser/core';

export async function contentRoutes(app: FastifyInstance): Promise<void> {
  // Get full structured content
  app.get<{ Params: { id: string } }>('/:id/content', async (request) => {
    const page = await app.sessionManager.getOrCreatePage(request.params.id);
    const controller = new PageController(page);
    const content = await controller.getContent();
    return { content };
  });

  // Get text only
  app.get<{ Params: { id: string } }>('/:id/text', async (request) => {
    const page = await app.sessionManager.getOrCreatePage(request.params.id);
    const controller = new PageController(page);
    const text = await controller.getText();
    return { text };
  });

  // Get links
  app.get<{ Params: { id: string } }>('/:id/links', async (request) => {
    const page = await app.sessionManager.getOrCreatePage(request.params.id);
    const controller = new PageController(page);
    const links = await controller.getLinks();
    return { links };
  });

  // Get tables
  app.get<{ Params: { id: string } }>('/:id/tables', async (request) => {
    const page = await app.sessionManager.getOrCreatePage(request.params.id);
    const controller = new PageController(page);
    const tables = await controller.getTables();
    return { tables };
  });

  // Get metadata
  app.get<{ Params: { id: string } }>('/:id/metadata', async (request) => {
    const page = await app.sessionManager.getOrCreatePage(request.params.id);
    const controller = new PageController(page);
    const metadata = await controller.getMetadata();
    return { metadata };
  });
}
