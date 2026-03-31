import type { Page } from 'puppeteer-core';
import type {
  ClickOptions,
  FillOptions,
  TypeOptions,
  SelectOptions,
  ScrollOptions,
  InteractiveElement,
  ClickByTextResult,
} from './types.js';

const DEFAULT_TIMEOUT = 30_000;

export async function click(page: Page, options: ClickOptions): Promise<void> {
  const { selector, timeout = DEFAULT_TIMEOUT, button = 'left', clickCount = 1, modifiers } = options;
  await page.waitForSelector(selector, { timeout });

  // Hold modifier keys if specified
  if (modifiers?.length) {
    for (const mod of modifiers) await page.keyboard.down(mod);
  }

  await page.click(selector, { button, count: clickCount });

  if (modifiers?.length) {
    for (const mod of modifiers.reverse()) await page.keyboard.up(mod);
  }
}

/**
 * Click the first element containing the specified text.
 * Returns info about what was clicked (tag, text, selector, rect).
 */
export async function clickByText(
  page: Page,
  text: string,
  options?: { exact?: boolean; containerSelector?: string },
): Promise<ClickByTextResult> {
  const { exact = false, containerSelector } = options ?? {};

  const result = await page.evaluate(
    (searchText: string, exactMatch: boolean, container: string | null) => {
      const root = container ? document.querySelector(container) ?? document.body : document.body;

      function buildSelector(el: Element): string {
        if ((el as HTMLElement).id) return `#${(el as HTMLElement).id}`;
        const tag = el.tagName.toLowerCase();
        const cls = el.className && typeof el.className === 'string'
          ? el.className.split(' ').filter(c => c && !c.includes(':')).slice(0, 2).join('.')
          : '';
        return cls ? `${tag}.${cls}` : tag;
      }

      function tryClick(el: Element): { tag: string; text: string; selector: string; rect: { x: number; y: number; width: number; height: number } } | null {
        const htmlEl = el as HTMLElement;
        if (!htmlEl.offsetParent && htmlEl.tagName !== 'BODY') return null;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return null;
        htmlEl.click();
        return {
          tag: htmlEl.tagName.toLowerCase(),
          text: (htmlEl.innerText?.trim() ?? '').substring(0, 100),
          selector: buildSelector(el),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        };
      }

      // Search clickable elements first
      const candidates = root.querySelectorAll('button, a, [role="button"], [onclick], input[type="submit"], input[type="button"], [class*="btn"], [class*="button"], lyte-button, [tabindex]');
      for (const el of candidates) {
        const elText = (el as HTMLElement).innerText?.trim() ?? el.textContent?.trim() ?? '';
        const matches = exactMatch ? elText === searchText : elText.includes(searchText);
        if (matches) {
          const info = tryClick(el);
          if (info) return info;
        }
      }

      // Fallback: search ALL leaf elements
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const htmlEl = node as HTMLElement;
        if (htmlEl.children?.length > 0) continue;
        const nodeText = htmlEl.innerText?.trim() ?? htmlEl.textContent?.trim() ?? '';
        const matches = exactMatch ? nodeText === searchText : nodeText.includes(searchText);
        if (matches) {
          const info = tryClick(htmlEl);
          if (info) return info;
        }
      }

      return null;
    },
    text,
    exact,
    containerSelector ?? null,
  );

  if (!result) {
    throw new Error(`No clickable element found with text: "${text}"`);
  }

  return { clicked: true, ...result };
}

/**
 * Click at specific page coordinates.
 */
export async function clickAtCoordinates(
  page: Page,
  x: number,
  y: number,
): Promise<void> {
  await page.mouse.click(x, y);
}

export async function fill(page: Page, options: FillOptions): Promise<void> {
  const { selector, value, timeout = DEFAULT_TIMEOUT, force = false } = options;

  if (force) {
    // Use JS injection — works for shadow DOM and custom components
    await page.evaluate(
      (sel: string, val: string) => {
        // Find the actual input, traversing into shadow roots
        function findInput(root: Document | ShadowRoot | Element, selector: string): HTMLInputElement | HTMLTextAreaElement | null {
          const el = root.querySelector(selector);
          if (el) {
            // If this is a wrapper, find the actual input inside
            const inner = el.querySelector('input, textarea') ?? el.shadowRoot?.querySelector('input, textarea');
            if (inner) return inner as HTMLInputElement;
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
          }
          // Search shadow roots
          for (const child of root.querySelectorAll('*')) {
            if (child.shadowRoot) {
              const found = findInput(child.shadowRoot, 'input, textarea');
              if (found) return found;
            }
          }
          return root.querySelector(selector) as HTMLInputElement | null;
        }

        const input = findInput(document, sel);
        if (!input) throw new Error(`Input not found: ${sel}`);

        // Use native setter to bypass framework watchers
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        )?.set ?? Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;

        if (nativeSetter) {
          nativeSetter.call(input, val);
        } else {
          input.value = val;
        }

        // Dispatch events to trigger framework reactivity
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      },
      selector,
      value,
    );
    return;
  }

  // Standard fill
  await page.waitForSelector(selector, { timeout });
  await page.click(selector, { count: 3 });
  await page.keyboard.press('Backspace');
  await page.type(selector, value);
}

export async function type(page: Page, options: TypeOptions): Promise<void> {
  const { selector, text, delay = 0, timeout = DEFAULT_TIMEOUT } = options;
  await page.waitForSelector(selector, { timeout });
  await page.type(selector, text, { delay });
}

export async function select(
  page: Page,
  options: SelectOptions,
): Promise<string[]> {
  const { selector, values, timeout = DEFAULT_TIMEOUT } = options;
  await page.waitForSelector(selector, { timeout });
  return page.select(selector, ...values);
}

export async function scroll(
  page: Page,
  options: ScrollOptions = {},
): Promise<void> {
  const { direction = 'down', amount = 500, selector } = options;
  const distance = direction === 'down' ? amount : -amount;

  if (selector) {
    await page.evaluate(
      (sel: string, dist: number) => {
        const el = document.querySelector(sel);
        el?.scrollBy(0, dist);
      },
      selector,
      distance,
    );
  } else {
    await page.evaluate((dist: number) => {
      window.scrollBy(0, dist);
    }, distance);
  }
}

/**
 * Discover all interactive elements on the page.
 * Returns clickable/focusable elements with text, type, bounding box, and a selector.
 */
export async function getInteractiveElements(page: Page): Promise<InteractiveElement[]> {
  return page.evaluate(() => {
    const elements: Array<{
      index: number;
      tag: string;
      type: string;
      text: string;
      placeholder: string;
      selector: string;
      rect: { x: number; y: number; width: number; height: number };
    }> = [];

    const selectors = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[onclick]',
      '[tabindex]:not([tabindex="-1"])',
      'lyte-button',
      'lyte-input',
      '[class*="btn"]',
      'summary',
    ].join(', ');

    const seen = new Set<Element>();
    let index = 0;

    for (const el of document.querySelectorAll(selectors)) {
      if (seen.has(el)) continue;
      seen.add(el);

      const htmlEl = el as HTMLElement;
      // Skip hidden elements
      if (!htmlEl.offsetParent && htmlEl.tagName !== 'BODY') continue;

      const rect = htmlEl.getBoundingClientRect();
      // Skip zero-size elements
      if (rect.width === 0 && rect.height === 0) continue;

      const text = htmlEl.innerText?.trim().substring(0, 100) ?? '';
      const tag = htmlEl.tagName.toLowerCase();
      const inputEl = htmlEl as HTMLInputElement;

      // Build a reliable selector
      let selector = '';
      if (htmlEl.id) {
        selector = `#${htmlEl.id}`;
      } else if (htmlEl.getAttribute('data-testid')) {
        selector = `[data-testid="${htmlEl.getAttribute('data-testid')}"]`;
      } else if (htmlEl.getAttribute('name')) {
        selector = `${tag}[name="${htmlEl.getAttribute('name')}"]`;
      } else if (htmlEl.getAttribute('aria-label')) {
        selector = `[aria-label="${htmlEl.getAttribute('aria-label')}"]`;
      } else if (htmlEl.className && typeof htmlEl.className === 'string') {
        const cls = htmlEl.className.split(' ').filter(c => c && !c.includes(':')).slice(0, 2).join('.');
        if (cls) selector = `${tag}.${cls}`;
      }

      let type = tag;
      if (tag === 'input') type = `input[${inputEl.type ?? 'text'}]`;
      else if (tag === 'a') type = 'link';
      else if (htmlEl.getAttribute('role')) type = htmlEl.getAttribute('role')!;

      index++;
      elements.push({
        index,
        tag,
        type,
        text: text || inputEl.placeholder || inputEl.value || '',
        placeholder: inputEl.placeholder ?? '',
        selector: selector || `${tag}:nth-of-type(${index})`,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      });
    }

    return elements;
  });
}

/**
 * Wait for a selector to appear on the page.
 */
export async function waitForSelector(
  page: Page,
  selector: string,
  timeout = DEFAULT_TIMEOUT,
): Promise<void> {
  await page.waitForSelector(selector, { timeout });
}

/**
 * Wait for network to be idle (no requests for 500ms).
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout = DEFAULT_TIMEOUT,
): Promise<void> {
  await page.waitForNetworkIdle({ idleTime: 500, timeout });
}

/**
 * Drag and drop — from one element/coordinates to another.
 * Supports selector-based and coordinate-based dragging.
 */
export async function dragAndDrop(
  page: Page,
  options: {
    fromSelector?: string;
    toSelector?: string;
    fromX?: number;
    fromY?: number;
    toX?: number;
    toY?: number;
    steps?: number;
  },
): Promise<void> {
  const { steps = 10 } = options;

  let fromX = options.fromX;
  let fromY = options.fromY;
  let toX = options.toX;
  let toY = options.toY;

  // Resolve selector positions
  if (options.fromSelector) {
    const rect = await page.evaluate((sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, options.fromSelector);
    if (!rect) throw new Error(`Drag source not found: ${options.fromSelector}`);
    fromX = rect.x;
    fromY = rect.y;
  }

  if (options.toSelector) {
    const rect = await page.evaluate((sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, options.toSelector);
    if (!rect) throw new Error(`Drop target not found: ${options.toSelector}`);
    toX = rect.x;
    toY = rect.y;
  }

  if (fromX == null || fromY == null || toX == null || toY == null) {
    throw new Error('drag_and_drop requires either selectors or coordinates for both source and target');
  }

  // Perform the drag using mouse events
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();

  // Move in steps to trigger dragover events
  for (let i = 1; i <= steps; i++) {
    const ratio = i / steps;
    const x = fromX + (toX - fromX) * ratio;
    const y = fromY + (toY - fromY) * ratio;
    await page.mouse.move(x, y);
  }

  await page.mouse.up();
}

/**
 * Press a keyboard key or key combination.
 */
export async function pressKey(
  page: Page,
  key: string,
): Promise<void> {
  await page.keyboard.press(key as any);
}

/**
 * Scroll until text is visible on the page.
 * Handles nested scrollable containers automatically.
 */
export async function scrollToText(
  page: Page,
  text: string,
  options?: { maxScrolls?: number; containerSelector?: string },
): Promise<boolean> {
  const { maxScrolls = 20, containerSelector } = options ?? {};

  for (let i = 0; i < maxScrolls; i++) {
    // Check if text is visible
    const found = await page.evaluate(
      (searchText: string) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (node.textContent?.includes(searchText)) {
            const el = node.parentElement;
            if (el) {
              const rect = el.getBoundingClientRect();
              // Check if visible in viewport
              if (rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 0 && rect.height > 0) {
                return true;
              }
              // Scroll it into view
              el.scrollIntoView({ behavior: 'instant', block: 'center' });
              return true;
            }
          }
        }
        return false;
      },
      text,
    );

    if (found) return true;

    // Scroll down in the container or page
    if (containerSelector) {
      await page.evaluate(
        (sel: string) => {
          const el = document.querySelector(sel);
          el?.scrollBy(0, 300);
        },
        containerSelector,
      );
    } else {
      await page.evaluate(() => window.scrollBy(0, 300));
    }

    // Small delay for content to render
    await new Promise((r) => setTimeout(r, 100));
  }

  return false;
}
