import { Session } from './session.js';
import type { AIBrowserConfig, SessionInfo } from './types.js';

export class AIBrowser {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: string | AIBrowserConfig = 'http://127.0.0.1:3000') {
    if (typeof config === 'string') {
      this.baseUrl = config.replace(/\/$/, '');
      this.headers = {};
    } else {
      this.baseUrl = config.baseUrl.replace(/\/$/, '');
      this.headers = config.headers ?? {};
    }
  }

  async createSession(): Promise<Session> {
    const res = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers },
      body: '{}',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(err.error?.message ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as { session: SessionInfo };
    return new Session(data.session.id, this.baseUrl, this.headers);
  }

  async listSessions(): Promise<SessionInfo[]> {
    const res = await fetch(`${this.baseUrl}/sessions`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as { sessions: SessionInfo[] };
    return data.sessions;
  }

  async getSession(id: string): Promise<Session> {
    // Verify session exists
    const res = await fetch(`${this.baseUrl}/sessions/${id}`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Session "${id}" not found`);
    }

    return new Session(id, this.baseUrl, this.headers);
  }

  async health(): Promise<{ status: string }> {
    const res = await fetch(`${this.baseUrl}/health`, {
      headers: this.headers,
    });
    return res.json() as Promise<{ status: string }>;
  }
}
