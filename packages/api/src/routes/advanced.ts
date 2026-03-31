import type { FastifyInstance } from 'fastify';
import { PageController, listTabs, switchTab, openNewTab, closeTab } from '@agent_browser/core';

export async function advancedRoutes(app: FastifyInstance): Promise<void> {

  // ── Hover ──

  app.post<{ Params: { id: string }; Body: { selector: string; timeout?: number } }>(
    '/:id/hover',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.hover(request.body.selector, request.body.timeout);
      return { success: true };
    },
  );

  // ── Viewport ──

  app.post<{ Params: { id: string }; Body: { width: number; height: number; deviceScaleFactor?: number; isMobile?: boolean; hasTouch?: boolean } }>(
    '/:id/viewport',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.setViewport(request.body);
      return { success: true };
    },
  );

  app.get<{ Params: { id: string } }>(
    '/:id/viewport',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      return { viewport: await controller.getViewport() };
    },
  );

  // ── Console ──

  app.post<{ Params: { id: string } }>(
    '/:id/console/start',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      controller.startConsoleCapture();
      return { success: true };
    },
  );

  app.get<{ Params: { id: string }; Querystring: { level?: string; clear?: string } }>(
    '/:id/console',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      const messages = controller.getConsoleMessages({
        level: request.query.level,
        clear: request.query.clear === 'true',
      });
      return { messages };
    },
  );

  // ── Network ──

  app.post<{ Params: { id: string } }>(
    '/:id/network/start',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      controller.startNetworkCapture();
      return { success: true };
    },
  );

  app.get<{ Params: { id: string }; Querystring: { urlPattern?: string; resourceType?: string; method?: string; statusCode?: string; failed?: string; excludeStatic?: string } }>(
    '/:id/network',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      const requests = controller.getNetworkRequests({
        urlPattern: request.query.urlPattern,
        resourceType: request.query.resourceType,
        method: request.query.method,
        statusCode: request.query.statusCode ? Number(request.query.statusCode) : undefined,
        failed: request.query.failed === 'true' ? true : undefined,
        excludeStatic: request.query.excludeStatic === 'true',
      });
      return { requests };
    },
  );

  // ── Dialogs ──

  app.post<{ Params: { id: string }; Body: { action: 'accept' | 'dismiss'; promptText?: string } }>(
    '/:id/dialogs/setup',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      controller.setupDialogHandler(request.body.action, request.body.promptText);
      return { success: true };
    },
  );

  app.get<{ Params: { id: string } }>(
    '/:id/dialogs',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      return { dialogs: controller.getDialogs() };
    },
  );

  // ── File Upload ──

  app.post<{ Params: { id: string }; Body: { selector: string; filePaths: string[]; timeout?: number } }>(
    '/:id/upload',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.uploadFile(request.body);
      return { success: true, uploaded: request.body.filePaths.length };
    },
  );

  // ── Accessibility ──

  app.get<{ Params: { id: string }; Querystring: { interestingOnly?: string; root?: string } }>(
    '/:id/accessibility',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      const snapshot = await controller.getAccessibilitySnapshot({
        interestingOnly: request.query.interestingOnly !== 'false',
        root: request.query.root,
      });
      return { snapshot };
    },
  );

  // ── Tabs ──

  app.get<{ Params: { id: string } }>(
    '/:id/tabs',
    async (request) => {
      const session = app.sessionManager.getSession(request.params.id);
      const tabs = await listTabs(session.browser);
      return { tabs };
    },
  );

  app.post<{ Params: { id: string }; Body: { index: number } }>(
    '/:id/tabs/switch',
    async (request) => {
      const session = app.sessionManager.getSession(request.params.id);
      const page = await switchTab(session.browser, request.body.index);
      session.pages.set('default', page);
      return { success: true, url: page.url() };
    },
  );

  app.post<{ Params: { id: string }; Body: { url?: string } }>(
    '/:id/tabs/new',
    async (request) => {
      const session = app.sessionManager.getSession(request.params.id);
      const { page, index } = await openNewTab(session.browser, request.body.url);
      session.pages.set('default', page);
      return { index, url: page.url() };
    },
  );

  app.delete<{ Params: { id: string }; Body: { index: number } }>(
    '/:id/tabs/:tabIndex',
    async (request) => {
      const session = app.sessionManager.getSession(request.params.id);
      const tabIndex = Number((request.params as any).tabIndex);
      await closeTab(session.browser, tabIndex);
      const pages = await session.browser.pages();
      if (pages.length > 0) session.pages.set('default', pages[0]);
      return { success: true };
    },
  );
}
