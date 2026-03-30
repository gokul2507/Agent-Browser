import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SessionManager, PageController } from '../src/index.js';

describe('AI Browser Core — Smoke Test', () => {
  let sessionManager: SessionManager;
  let sessionId: string;

  beforeAll(async () => {
    sessionManager = new SessionManager({
      host: process.env.LIGHTPANDA_HOST ?? '127.0.0.1',
      port: Number(process.env.LIGHTPANDA_PORT ?? 9222),
    });
    await sessionManager.start();
  }, 30_000);

  afterAll(async () => {
    await sessionManager.stop();
  }, 10_000);

  it('should create a session', async () => {
    const session = await sessionManager.createSession();
    sessionId = session.id;

    expect(session.id).toBeDefined();
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.currentUrl).toBeNull();
  });

  it('should list sessions', () => {
    const sessions = sessionManager.listSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    expect(sessions.some((s) => s.id === sessionId)).toBe(true);
  });

  it('should navigate to a page and extract content', async () => {
    const page = await sessionManager.getOrCreatePage(sessionId);
    const controller = new PageController(page);

    const result = await controller.navigate('https://example.com');

    expect(result.url).toContain('example.com');
    expect(result.title).toBeTruthy();
    // Lightpanda may not return HTTP status via CDP like Chrome does
    expect(result.status === 200 || result.status === null).toBe(true);
    expect(result.loadTimeMs).toBeGreaterThan(0);
  }, 30_000);

  it('should extract text content', async () => {
    const page = await sessionManager.getOrCreatePage(sessionId);
    const controller = new PageController(page);

    const text = await controller.getText();

    expect(text).toBeTruthy();
    expect(text.length).toBeGreaterThan(0);
  });

  it('should extract structured page content', async () => {
    const page = await sessionManager.getOrCreatePage(sessionId);
    const controller = new PageController(page);

    const content = await controller.getContent();

    expect(content.url).toContain('example.com');
    expect(content.title).toBeTruthy();
    expect(content.text).toBeTruthy();
    expect(content.metadata).toBeDefined();
    expect(Array.isArray(content.links)).toBe(true);
    expect(Array.isArray(content.tables)).toBe(true);
    expect(Array.isArray(content.forms)).toBe(true);
  });

  it('should extract links', async () => {
    const page = await sessionManager.getOrCreatePage(sessionId);
    const controller = new PageController(page);

    const links = await controller.getLinks();

    expect(Array.isArray(links)).toBe(true);
    // example.com has at least one link
    if (links.length > 0) {
      expect(links[0]).toHaveProperty('text');
      expect(links[0]).toHaveProperty('href');
    }
  });

  it('should execute JavaScript', async () => {
    const page = await sessionManager.getOrCreatePage(sessionId);
    const controller = new PageController(page);

    const result = await controller.executeJs({
      expression: '() => document.title',
    });

    expect(result.result).toBeTruthy();
    expect(result.error).toBeUndefined();
  });

  it('should destroy a session', async () => {
    await sessionManager.destroySession(sessionId);
    const sessions = sessionManager.listSessions();
    expect(sessions.some((s) => s.id === sessionId)).toBe(false);
  });
});
