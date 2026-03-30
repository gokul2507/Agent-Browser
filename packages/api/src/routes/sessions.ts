import type { FastifyInstance } from 'fastify';
import type { EngineType } from '@agent_browser/core';

interface CreateSessionBody {
  engine?: EngineType;
}

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // Create a new session
  app.post<{ Body: CreateSessionBody }>('/', async (request, reply) => {
    const engine = request.body?.engine;
    const session = await app.sessionManager.createSession(engine);
    reply.status(201).send({ session });
  });

  // List all sessions
  app.get('/', async () => {
    const sessions = app.sessionManager.listSessions();
    return { sessions };
  });

  // Get session info
  app.get<{ Params: { id: string } }>('/:id', async (request) => {
    const session = app.sessionManager.getSession(request.params.id);
    const defaultPage = session.pages.get('default');
    return {
      session: {
        id: session.id,
        engine: session.engine,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        currentUrl: defaultPage?.url() ?? null,
      },
    };
  });

  // Destroy a session
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await app.sessionManager.destroySession(request.params.id);
    reply.status(204).send();
  });
}
