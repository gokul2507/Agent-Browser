import type {
  NavigateResult,
  PageContent,
  PageLink,
  PageTable,
  PageMetadata,
  ExecuteJsResult,
  ScreenshotResult,
  Cookie,
  CookieParam,
} from './types.js';

export class Session {
  constructor(
    public readonly id: string,
    private baseUrl: string,
    private headers: Record<string, string>,
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}/sessions/${this.id}${path}`;
    const opts: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', ...this.headers },
    };
    // Always send a body for POST to avoid Fastify rejecting empty body with content-type
    if (method === 'POST') {
      opts.body = JSON.stringify(body ?? {});
    } else if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(err.error?.message ?? `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  // ── Navigation ──

  async navigate(
    url: string,
    options?: { waitUntil?: string; timeout?: number },
  ): Promise<NavigateResult> {
    const data = await this.request<{ result: NavigateResult }>('POST', '/navigate', {
      url,
      ...options,
    });
    return data.result;
  }

  async goBack(): Promise<NavigateResult> {
    const data = await this.request<{ result: NavigateResult }>('POST', '/back');
    return data.result;
  }

  async goForward(): Promise<NavigateResult> {
    const data = await this.request<{ result: NavigateResult }>('POST', '/forward');
    return data.result;
  }

  async reload(): Promise<NavigateResult> {
    const data = await this.request<{ result: NavigateResult }>('POST', '/reload');
    return data.result;
  }

  // ── Content ──

  async getContent(): Promise<PageContent> {
    const data = await this.request<{ content: PageContent }>('GET', '/content');
    return data.content;
  }

  async getText(): Promise<string> {
    const data = await this.request<{ text: string }>('GET', '/text');
    return data.text;
  }

  async getLinks(): Promise<PageLink[]> {
    const data = await this.request<{ links: PageLink[] }>('GET', '/links');
    return data.links;
  }

  async getTables(): Promise<PageTable[]> {
    const data = await this.request<{ tables: PageTable[] }>('GET', '/tables');
    return data.tables;
  }

  async getMetadata(): Promise<PageMetadata> {
    const data = await this.request<{ metadata: PageMetadata }>('GET', '/metadata');
    return data.metadata;
  }

  // ── Actions ──

  async click(selector: string, timeout?: number): Promise<void> {
    await this.request('POST', '/click', { selector, timeout });
  }

  async fill(selector: string, value: string, timeout?: number): Promise<void> {
    await this.request('POST', '/fill', { selector, value, timeout });
  }

  async type(selector: string, text: string, options?: { delay?: number; timeout?: number }): Promise<void> {
    await this.request('POST', '/type', { selector, text, ...options });
  }

  async select(selector: string, values: string[], timeout?: number): Promise<string[]> {
    const data = await this.request<{ selected: string[] }>('POST', '/select', {
      selector,
      values,
      timeout,
    });
    return data.selected;
  }

  async scroll(options?: { direction?: 'up' | 'down'; amount?: number; selector?: string }): Promise<void> {
    await this.request('POST', '/scroll', options ?? {});
  }

  // ── JavaScript ──

  async executeJs(expression: string): Promise<ExecuteJsResult> {
    const data = await this.request<{ result: ExecuteJsResult }>('POST', '/execute', {
      expression,
    });
    return data.result;
  }

  // ── Screenshots ──

  async screenshot(options?: {
    fullPage?: boolean;
    type?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    selector?: string;
  }): Promise<ScreenshotResult> {
    const params = new URLSearchParams();
    if (options?.fullPage) params.set('fullPage', 'true');
    if (options?.type) params.set('type', options.type);
    if (options?.quality !== undefined) params.set('quality', String(options.quality));
    if (options?.selector) params.set('selector', options.selector);
    const qs = params.toString();

    const data = await this.request<{ screenshot: ScreenshotResult }>(
      'GET',
      `/screenshot${qs ? `?${qs}` : ''}`,
    );
    return data.screenshot;
  }

  // ── Cookies ──

  async getCookies(): Promise<Cookie[]> {
    const data = await this.request<{ cookies: Cookie[] }>('GET', '/cookies');
    return data.cookies;
  }

  async setCookies(cookies: CookieParam[]): Promise<void> {
    await this.request('POST', '/cookies', { cookies });
  }

  async clearCookies(): Promise<void> {
    await this.request('DELETE', '/cookies');
  }

  // ── Lifecycle ──

  async destroy(): Promise<void> {
    const url = `${this.baseUrl}/sessions/${this.id}`;
    await fetch(url, { method: 'DELETE', headers: this.headers });
  }
}
