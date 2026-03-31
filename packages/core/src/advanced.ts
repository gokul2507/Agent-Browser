import type { Page, Browser, CDPSession } from 'puppeteer-core';
import type {
  ConsoleMessage,
  NetworkRequest,
  NetworkFilter,
  DialogInfo,
  ViewportSize,
  AccessibilityNode,
  TabInfo,
  FileUploadOptions,
} from './types.js';

// ── Hover ──

export async function hover(page: Page, selector: string, timeout = 30_000): Promise<void> {
  await page.waitForSelector(selector, { timeout });
  await page.hover(selector);
}

// ── Viewport Resize ──

export async function setViewport(page: Page, viewport: ViewportSize): Promise<void> {
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    isMobile: viewport.isMobile ?? false,
    hasTouch: viewport.hasTouch ?? false,
  });
}

export async function getViewport(page: Page): Promise<ViewportSize> {
  const vp = page.viewport();
  return {
    width: vp?.width ?? 1280,
    height: vp?.height ?? 720,
    deviceScaleFactor: vp?.deviceScaleFactor ?? 1,
    isMobile: vp?.isMobile ?? false,
    hasTouch: vp?.hasTouch ?? false,
  };
}

// ── Console Messages ──

/**
 * Start capturing console messages on a page.
 * Returns a function to retrieve captured messages and stop capturing.
 */
export function startConsoleCapture(page: Page): {
  getMessages: (filter?: { level?: string; clear?: boolean }) => ConsoleMessage[];
  stop: () => void;
} {
  const messages: ConsoleMessage[] = [];

  const handler = (msg: any) => {
    messages.push({
      type: msg.type() as ConsoleMessage['type'],
      text: msg.text(),
      timestamp: Date.now(),
      url: msg.location()?.url,
      lineNumber: msg.location()?.lineNumber,
    });
  };

  page.on('console', handler);

  return {
    getMessages: (filter) => {
      let result = [...messages];
      if (filter?.level) {
        result = result.filter((m) => m.type === filter.level);
      }
      if (filter?.clear) {
        messages.length = 0;
      }
      return result;
    },
    stop: () => {
      page.off('console', handler);
    },
  };
}

// ── Network Request Inspection ──

/**
 * Start capturing network requests on a page.
 * Returns a function to retrieve captured requests and stop capturing.
 */
export function startNetworkCapture(page: Page): {
  getRequests: (filter?: NetworkFilter) => NetworkRequest[];
  stop: () => void;
  clear: () => void;
} {
  const requests: NetworkRequest[] = [];

  const STATIC_TYPES = new Set(['stylesheet', 'image', 'font', 'media']);

  const requestHandler = (req: any) => {
    const entry: NetworkRequest = {
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      status: null,
      statusText: '',
      requestHeaders: req.headers() ?? {},
      responseHeaders: {},
      requestBody: req.postData() ?? undefined,
      responseSize: null,
      timing: null,
      failed: false,
    };
    requests.push(entry);
  };

  const responseHandler = (res: any) => {
    const url = res.url();
    const entry = requests.find((r) => r.url === url && r.status === null);
    if (entry) {
      entry.status = res.status();
      entry.statusText = res.statusText();
      entry.responseHeaders = res.headers() ?? {};
      try {
        const timing = res.timing();
        if (timing) entry.timing = timing.receiveHeadersEnd;
      } catch {}
    }
  };

  const failHandler = (req: any) => {
    const url = req.url();
    const entry = requests.find((r) => r.url === url && !r.failed);
    if (entry) {
      entry.failed = true;
      entry.failureText = req.failure()?.errorText ?? 'Unknown failure';
    }
  };

  page.on('request', requestHandler);
  page.on('response', responseHandler);
  page.on('requestfailed', failHandler);

  return {
    getRequests: (filter) => {
      let result = [...requests];
      if (filter?.urlPattern) {
        const regex = new RegExp(filter.urlPattern);
        result = result.filter((r) => regex.test(r.url));
      }
      if (filter?.resourceType) {
        result = result.filter((r) => r.resourceType === filter.resourceType);
      }
      if (filter?.method) {
        result = result.filter((r) => r.method === filter.method);
      }
      if (filter?.statusCode !== undefined) {
        result = result.filter((r) => r.status === filter.statusCode);
      }
      if (filter?.failed !== undefined) {
        result = result.filter((r) => r.failed === filter.failed);
      }
      if (filter?.excludeStatic) {
        result = result.filter((r) => !STATIC_TYPES.has(r.resourceType));
      }
      return result;
    },
    stop: () => {
      page.off('request', requestHandler);
      page.off('response', responseHandler);
      page.off('requestfailed', failHandler);
    },
    clear: () => {
      requests.length = 0;
    },
  };
}

// ── Dialog Handling ──

/**
 * Set up dialog auto-handling on a page.
 * Returns a function to configure how dialogs are handled and retrieve dialog history.
 */
export function setupDialogHandler(page: Page): {
  setAutoResponse: (action: 'accept' | 'dismiss', promptText?: string) => void;
  getDialogs: () => DialogInfo[];
  clear: () => void;
  stop: () => void;
} {
  const dialogs: DialogInfo[] = [];
  let autoAction: 'accept' | 'dismiss' = 'dismiss';
  let autoPromptText: string | undefined;

  const handler = async (dialog: any) => {
    dialogs.push({
      type: dialog.type() as DialogInfo['type'],
      message: dialog.message(),
      defaultValue: dialog.defaultValue() ?? undefined,
    });

    if (autoAction === 'accept') {
      await dialog.accept(autoPromptText);
    } else {
      await dialog.dismiss();
    }
  };

  page.on('dialog', handler);

  return {
    setAutoResponse: (action, promptText) => {
      autoAction = action;
      autoPromptText = promptText;
    },
    getDialogs: () => [...dialogs],
    clear: () => {
      dialogs.length = 0;
    },
    stop: () => {
      page.off('dialog', handler);
    },
  };
}

// ── File Upload ──

export async function uploadFile(page: Page, options: FileUploadOptions): Promise<void> {
  const { selector, filePaths, timeout = 30_000 } = options;
  await page.waitForSelector(selector, { timeout });

  const input = await page.$(selector);
  if (!input) throw new Error(`File input not found: ${selector}`);

  await (input as any).uploadFile(...filePaths);
}

// ── Accessibility Snapshot ──

export async function getAccessibilitySnapshot(
  page: Page,
  options?: { interestingOnly?: boolean; root?: string },
): Promise<AccessibilityNode | null> {
  const rootEl = options?.root ? await page.$(options.root) : undefined;

  const snapshot = await page.accessibility.snapshot({
    interestingOnly: options?.interestingOnly ?? true,
    root: rootEl ?? undefined,
  });

  if (!snapshot) return null;

  function mapNode(node: any): AccessibilityNode {
    const result: AccessibilityNode = {
      role: node.role ?? '',
      name: node.name ?? '',
    };
    if (node.value !== undefined) result.value = node.value;
    if (node.description) result.description = node.description;
    if (node.checked !== undefined) result.checked = node.checked;
    if (node.disabled) result.disabled = node.disabled;
    if (node.expanded !== undefined) result.expanded = node.expanded;
    if (node.focused) result.focused = node.focused;
    if (node.level !== undefined) result.level = node.level;
    if (node.selected) result.selected = node.selected;
    if (node.children?.length) {
      result.children = node.children.map(mapNode);
    }
    return result;
  }

  return mapNode(snapshot);
}

// ── Tab Management ──

export async function listTabs(browser: Browser): Promise<TabInfo[]> {
  const pages = await browser.pages();
  const tabs: TabInfo[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    tabs.push({
      index: i,
      url: page.url(),
      title: await page.title().catch(() => ''),
      active: !page.isClosed(),
    });
  }

  return tabs;
}

export async function switchTab(browser: Browser, index: number): Promise<Page> {
  const pages = await browser.pages();
  if (index < 0 || index >= pages.length) {
    throw new Error(`Tab index ${index} out of range (0-${pages.length - 1})`);
  }
  const page = pages[index];
  await page.bringToFront();
  return page;
}

export async function openNewTab(browser: Browser, url?: string): Promise<{ page: Page; index: number }> {
  const page = await browser.newPage();
  if (url) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }
  const pages = await browser.pages();
  return { page, index: pages.indexOf(page) };
}

export async function closeTab(browser: Browser, index: number): Promise<void> {
  const pages = await browser.pages();
  if (index < 0 || index >= pages.length) {
    throw new Error(`Tab index ${index} out of range (0-${pages.length - 1})`);
  }
  if (pages.length === 1) {
    throw new Error('Cannot close the last tab');
  }
  await pages[index].close();
}
