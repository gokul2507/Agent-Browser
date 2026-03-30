import type { FastifyInstance } from 'fastify';
import {
  PageController,
  type CookieParam,
  importCookiesFromJson,
  importCookiesFromNetscape,
  exportCookiesToJson,
  exportCookiesToNetscape,
  loadCookiesFromFile,
  extractCookiesFromPage,
  injectCookiesIntoPage,
} from '@anthropic-ai-browser/core';

export async function cookieRoutes(app: FastifyInstance): Promise<void> {
  // Get cookies
  app.get<{ Params: { id: string } }>('/:id/cookies', async (request) => {
    const page = await app.sessionManager.getOrCreatePage(request.params.id);
    const controller = new PageController(page);
    const cookies = await controller.getCookies();
    return { cookies };
  });

  // Set cookies
  app.post<{ Params: { id: string }; Body: { cookies: CookieParam[] } }>(
    '/:id/cookies',
    async (request) => {
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const controller = new PageController(page);
      await controller.setCookies(request.body.cookies);
      return { success: true };
    },
  );

  // Clear cookies
  app.delete<{ Params: { id: string } }>('/:id/cookies', async (request) => {
    const page = await app.sessionManager.getOrCreatePage(request.params.id);
    const controller = new PageController(page);
    await controller.clearCookies();
    return { success: true };
  });

  // ── Import cookies from JSON or Netscape format ──
  app.post<{ Params: { id: string }; Body: { data: string; format?: 'json' | 'netscape' | 'auto' } }>(
    '/:id/cookies/import',
    async (request) => {
      const { data, format = 'auto' } = request.body;
      const page = await app.sessionManager.getOrCreatePage(request.params.id);

      let cookies: CookieParam[];

      if (format === 'json' || (format === 'auto' && (data.trimStart().startsWith('{') || data.trimStart().startsWith('[')))) {
        cookies = importCookiesFromJson(data);
      } else {
        cookies = importCookiesFromNetscape(data);
      }

      await injectCookiesIntoPage(page, cookies);

      return { success: true, imported: cookies.length };
    },
  );

  // Import cookies from a local file path
  app.post<{ Params: { id: string }; Body: { filePath: string } }>(
    '/:id/cookies/import-file',
    async (request) => {
      const { filePath } = request.body;
      const page = await app.sessionManager.getOrCreatePage(request.params.id);

      const cookies = loadCookiesFromFile(filePath);
      await injectCookiesIntoPage(page, cookies);

      return { success: true, imported: cookies.length };
    },
  );

  // ── Export cookies ──
  app.get<{ Params: { id: string }; Querystring: { format?: 'json' | 'netscape' } }>(
    '/:id/cookies/export',
    async (request) => {
      const { format = 'json' } = request.query;
      const page = await app.sessionManager.getOrCreatePage(request.params.id);
      const cookies = await extractCookiesFromPage(page);

      if (format === 'netscape') {
        return { format: 'netscape', data: exportCookiesToNetscape(cookies) };
      }

      return { format: 'json', data: exportCookiesToJson(cookies) };
    },
  );
}
