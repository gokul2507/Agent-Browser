import { randomUUID } from 'node:crypto';
import type { Page } from 'puppeteer-core';
import type { BrowserEngine } from './engine.js';
import { createEngine } from './browser.js';
import {
  type BrowserConfig,
  type ChromiumConfig,
  type EngineType,
  type Session,
  type SessionInfo,
  type SessionManagerConfig,
  DEFAULT_SESSION_CONFIG,
} from './types.js';

export interface SessionManagerEngineConfig {
  lightpanda?: Partial<BrowserConfig>;
  chromium?: Partial<ChromiumConfig>;
}

export class SessionManager {
  private engines = new Map<EngineType, BrowserEngine>();
  private engineConfig: SessionManagerEngineConfig;
  private sessions = new Map<string, Session>();
  private config: Required<SessionManagerConfig>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    browserConfig: Partial<BrowserConfig> = {},
    sessionConfig: Partial<SessionManagerConfig> = {},
    chromiumConfig: Partial<ChromiumConfig> = {},
  ) {
    this.engineConfig = {
      lightpanda: browserConfig,
      chromium: chromiumConfig,
    };
    this.config = { ...DEFAULT_SESSION_CONFIG, ...sessionConfig };
  }

  /**
   * Get or create an engine instance for the given type.
   */
  private getEngine(type: EngineType): BrowserEngine {
    // Resolve 'auto' to the default engine
    const resolvedType = type === 'auto' ? this.config.defaultEngine : type;
    const engineType = resolvedType === 'auto' ? 'lightpanda' : resolvedType;

    let engine = this.engines.get(engineType);
    if (!engine) {
      engine = createEngine(engineType, this.engineConfig);
      this.engines.set(engineType, engine);
    }
    return engine;
  }

  async start(): Promise<void> {
    // Don't start any engine eagerly — engines start lazily on first createSession call.
    // This allows Chromium-only users to skip Lightpanda entirely.
    this.startCleanupLoop();
  }

  async stop(): Promise<void> {
    this.stopCleanupLoop();

    const destroyPromises = Array.from(this.sessions.keys()).map((id) =>
      this.destroySession(id),
    );
    await Promise.all(destroyPromises);

    for (const engine of this.engines.values()) {
      await engine.stop();
    }
    this.engines.clear();
  }

  async createSession(engine?: EngineType): Promise<SessionInfo> {
    const requestedEngine = engine ?? this.config.defaultEngine;

    // Ensure cleanup loop is running
    if (!this.cleanupInterval) {
      this.startCleanupLoop();
    }

    if (this.sessions.size >= this.config.maxSessions) {
      throw new Error(
        `Maximum sessions (${this.config.maxSessions}) reached. Destroy a session first.`,
      );
    }

    // For 'auto' mode, try lightpanda first, fall back to chromium
    if (requestedEngine === 'auto') {
      try {
        return await this.createSessionWithEngine('lightpanda');
      } catch {
        return await this.createSessionWithEngine('chromium');
      }
    }

    return this.createSessionWithEngine(requestedEngine);
  }

  private async createSessionWithEngine(engineType: EngineType): Promise<SessionInfo> {
    const resolvedType = engineType === 'auto' ? 'lightpanda' : engineType;
    const engine = this.getEngine(resolvedType);

    if (!engine.isRunning) {
      await engine.start();
    }

    const id = randomUUID();
    const browser = await engine.connect();
    const now = new Date();

    const session: Session = {
      id,
      engine: resolvedType,
      browser,
      pages: new Map(),
      createdAt: now,
      lastActivity: now,
    };

    this.sessions.set(id, session);

    return {
      id,
      engine: resolvedType,
      createdAt: now,
      lastActivity: now,
      currentUrl: null,
    };
  }

  private autoSessionId: string | null = null;

  getSession(id: string): Session {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(
        `Session "${id}" not found. It may have expired due to inactivity ` +
        `(timeout: ${this.config.idleTimeoutMs / 1000}s). Create a new session with create_session.`
      );
    }
    // Auto-extend timeout on every activity
    session.lastActivity = new Date();
    return session;
  }

  /**
   * Get or auto-create a default session.
   * If sessionId is provided, use it. Otherwise, reuse or create an auto-session.
   */
  async getOrAutoSession(sessionId?: string, engine?: EngineType): Promise<string> {
    if (sessionId) return sessionId;

    // Reuse existing auto-session if still alive
    if (this.autoSessionId && this.sessions.has(this.autoSessionId)) {
      return this.autoSessionId;
    }

    // Auto-create a new session
    const info = await this.createSession(engine ?? this.config.defaultEngine);
    this.autoSessionId = info.id;
    return info.id;
  }

  async getOrCreatePage(sessionId: string, pageId?: string): Promise<Page> {
    const session = this.getSession(sessionId);
    const pid = pageId ?? 'default';

    let page = session.pages.get(pid);
    if (!page || page.isClosed()) {
      if (session.engine === 'chromium') {
        // Chromium: use default browser context (supports full features)
        page = await session.browser.newPage();
      } else {
        // Lightpanda: create isolated browser context per page
        const context = await session.browser.createBrowserContext();
        page = await context.newPage();
      }
      session.pages.set(pid, page);
    }

    return page;
  }

  async destroySession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) return;

    for (const page of session.pages.values()) {
      if (!page.isClosed()) {
        await page.close().catch(() => {});
      }
    }

    // Chromium sessions own their browser instance — close it
    if (session.engine === 'chromium') {
      await session.browser.close().catch(() => {});
    } else {
      session.browser.disconnect();
    }

    this.sessions.delete(id);
  }

  listSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((s) => this.toSessionInfo(s));
  }

  private toSessionInfo(session: Session): SessionInfo {
    const defaultPage = session.pages.get('default');
    return {
      id: session.id,
      engine: session.engine,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      currentUrl: defaultPage?.url() ?? null,
    };
  }

  private startCleanupLoop(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions) {
        if (now - session.lastActivity.getTime() > this.config.idleTimeoutMs) {
          this.destroySession(id).catch(() => {});
        }
      }
    }, 60_000);
  }

  private stopCleanupLoop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
