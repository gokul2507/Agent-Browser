import type { Page } from 'puppeteer-core';
import {
  extractContent,
  extractLinks,
  extractMetadata,
  extractTables,
  extractText,
} from './extractor.js';
import * as actions from './actions.js';
import type {
  NavigateOptions,
  NavigateResult,
  PageContent,
  PageLink,
  PageMetadata,
  PageTable,
  ClickOptions,
  FillOptions,
  TypeOptions,
  SelectOptions,
  ScrollOptions,
  ExecuteJsOptions,
  ExecuteJsResult,
  ScreenshotOptions,
  ScreenshotResult,
  CookieParam,
  Cookie,
  InteractiveElement,
  ClickByTextResult,
} from './types.js';

export class PageController {
  constructor(private page: Page) {}

  get rawPage(): Page {
    return this.page;
  }

  // ── Navigation ──

  async navigate(
    url: string,
    options: NavigateOptions = {},
  ): Promise<NavigateResult> {
    const { waitUntil = 'domcontentloaded', timeout = 30_000 } = options;
    const start = Date.now();

    const response = await this.page.goto(url, { waitUntil, timeout });

    return {
      url: this.page.url(),
      title: await this.page.title(),
      status: response?.status() ?? null,
      loadTimeMs: Date.now() - start,
    };
  }

  async goBack(): Promise<NavigateResult> {
    const start = Date.now();
    const response = await this.page.goBack({ waitUntil: 'domcontentloaded' });
    return {
      url: this.page.url(),
      title: await this.page.title(),
      status: response?.status() ?? null,
      loadTimeMs: Date.now() - start,
    };
  }

  async goForward(): Promise<NavigateResult> {
    const start = Date.now();
    const response = await this.page.goForward({ waitUntil: 'domcontentloaded' });
    return {
      url: this.page.url(),
      title: await this.page.title(),
      status: response?.status() ?? null,
      loadTimeMs: Date.now() - start,
    };
  }

  async reload(): Promise<NavigateResult> {
    const start = Date.now();
    const response = await this.page.reload({ waitUntil: 'domcontentloaded' });
    return {
      url: this.page.url(),
      title: await this.page.title(),
      status: response?.status() ?? null,
      loadTimeMs: Date.now() - start,
    };
  }

  // ── Content Extraction ──

  async getContent(): Promise<PageContent> {
    return extractContent(this.page);
  }

  async getText(): Promise<string> {
    return extractText(this.page);
  }

  async getLinks(): Promise<PageLink[]> {
    return extractLinks(this.page);
  }

  async getTables(): Promise<PageTable[]> {
    return extractTables(this.page);
  }

  async getMetadata(): Promise<PageMetadata> {
    return extractMetadata(this.page);
  }

  // ── Actions ──

  async click(options: ClickOptions): Promise<void> {
    return actions.click(this.page, options);
  }

  async fill(options: FillOptions): Promise<void> {
    return actions.fill(this.page, options);
  }

  async type(options: TypeOptions): Promise<void> {
    return actions.type(this.page, options);
  }

  async select(options: SelectOptions): Promise<string[]> {
    return actions.select(this.page, options);
  }

  async scroll(options?: ScrollOptions): Promise<void> {
    return actions.scroll(this.page, options);
  }

  async clickByText(text: string, options?: { exact?: boolean; containerSelector?: string }): Promise<ClickByTextResult> {
    return actions.clickByText(this.page, text, options);
  }

  async clickAtCoordinates(x: number, y: number): Promise<void> {
    return actions.clickAtCoordinates(this.page, x, y);
  }

  async getInteractiveElements(): Promise<InteractiveElement[]> {
    return actions.getInteractiveElements(this.page);
  }

  async dragAndDrop(options: {
    fromSelector?: string; toSelector?: string;
    fromX?: number; fromY?: number; toX?: number; toY?: number;
    steps?: number;
  }): Promise<void> {
    return actions.dragAndDrop(this.page, options);
  }

  async pressKey(key: string): Promise<void> {
    return actions.pressKey(this.page, key);
  }

  async scrollToText(text: string, options?: { maxScrolls?: number; containerSelector?: string }): Promise<boolean> {
    return actions.scrollToText(this.page, text, options);
  }

  // ── Wait Utilities ──

  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    return actions.waitForSelector(this.page, selector, timeout);
  }

  async waitForNetworkIdle(timeout?: number): Promise<void> {
    return actions.waitForNetworkIdle(this.page, timeout);
  }

  // ── JavaScript Execution ──

  async executeJs(options: ExecuteJsOptions): Promise<ExecuteJsResult> {
    try {
      // Pass expression as a string to evaluate in the browser context.
      // Supports both arrow functions "() => document.title" and raw expressions "1 + 2"
      const expression = options.expression.trim();
      const wrapped = expression.startsWith('(') || expression.startsWith('function')
        ? `(${expression})()`
        : expression;

      const result = await this.page.evaluate(wrapped);
      return { result };
    } catch (err) {
      return {
        result: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ── Screenshots ──

  async screenshot(options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    const {
      fullPage = false,
      type: imgType = 'png',
      quality,
      selector,
    } = options;

    let data: string;

    if (selector) {
      const element = await this.page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      const buffer = await element.screenshot({
        type: imgType,
        quality: imgType !== 'png' ? quality : undefined,
        encoding: 'base64',
      });
      data = typeof buffer === 'string' ? buffer : Buffer.from(buffer).toString('base64');
    } else {
      const buffer = await this.page.screenshot({
        fullPage,
        type: imgType,
        quality: imgType !== 'png' ? quality : undefined,
        encoding: 'base64',
      });
      data = typeof buffer === 'string' ? buffer : Buffer.from(buffer).toString('base64');
    }

    return {
      data,
      mimeType: `image/${imgType}`,
    };
  }

  // ── Cookies ──

  async getCookies(): Promise<Cookie[]> {
    const cookies = await this.page.cookies();
    return cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      expires: c.expires,
      sameSite: c.sameSite as Cookie['sameSite'],
    }));
  }

  async setCookies(cookies: CookieParam[]): Promise<void> {
    await this.page.setCookie(
      ...cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path ?? '/',
        secure: c.secure,
        httpOnly: c.httpOnly,
        expires: c.expires,
        sameSite: c.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
      })),
    );
  }

  async clearCookies(): Promise<void> {
    const cookies = await this.page.cookies();
    if (cookies.length > 0) {
      await this.page.deleteCookie(...cookies);
    }
  }

  async waitForNavigation(
    waitUntil: NavigateOptions['waitUntil'] = 'domcontentloaded',
    timeout = 30_000,
  ): Promise<void> {
    await this.page.waitForNavigation({ waitUntil, timeout });
  }

  async close(): Promise<void> {
    if (!this.page.isClosed()) {
      await this.page.close();
    }
  }
}
