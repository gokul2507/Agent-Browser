import type { Page } from 'puppeteer-core';
import type {
  PageContent,
  PageForm,
  PageLink,
  PageMetadata,
  PageTable,
} from './types.js';

export async function extractContent(page: Page): Promise<PageContent> {
  const [url, title, text, metadata, links, tables, forms] = await Promise.all([
    page.url(),
    page.title(),
    extractText(page),
    extractMetadata(page),
    extractLinks(page),
    extractTables(page),
    extractForms(page),
  ]);

  return { url, title, text, metadata, links, tables, forms };
}

export async function extractText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const body = document.body;
    if (!body) return '';

    // Remove script and style elements from consideration
    const clone = body.cloneNode(true) as HTMLElement;
    for (const el of clone.querySelectorAll('script, style, noscript')) {
      el.remove();
    }

    return clone.innerText?.trim() ?? '';
  });
}

export async function extractMetadata(page: Page): Promise<PageMetadata> {
  return page.evaluate(() => {
    const getMeta = (name: string): string | undefined => {
      const el =
        document.querySelector(`meta[name="${name}"]`) ??
        document.querySelector(`meta[property="${name}"]`);
      return el?.getAttribute('content') ?? undefined;
    };

    return {
      description: getMeta('description'),
      author: getMeta('author'),
      publishedDate:
        getMeta('article:published_time') ?? getMeta('date'),
      ogTitle: getMeta('og:title'),
      ogImage: getMeta('og:image'),
    };
  });
}

export async function extractLinks(page: Page): Promise<PageLink[]> {
  return page.evaluate(() => {
    const baseUrl = document.baseURI;
    return Array.from(document.querySelectorAll('a[href]')).map((a) => {
      const anchor = a as HTMLAnchorElement;
      let href: string;
      try {
        href = new URL(anchor.getAttribute('href') ?? '', baseUrl).href;
      } catch {
        href = anchor.getAttribute('href') ?? '';
      }
      return {
        text: anchor.innerText?.trim() ?? '',
        href,
      };
    });
  });
}

export async function extractTables(page: Page): Promise<PageTable[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map((table) => {
      const headers: string[] = [];
      for (const th of table.querySelectorAll('thead th, tr:first-child th')) {
        headers.push(th.textContent?.trim() ?? '');
      }

      const rows: string[][] = [];
      const bodyRows = table.querySelectorAll('tbody tr, tr');
      for (const tr of bodyRows) {
        const cells = tr.querySelectorAll('td');
        if (cells.length === 0) continue;
        rows.push(Array.from(cells).map((td) => td.textContent?.trim() ?? ''));
      }

      return { headers, rows };
    });
  });
}

export async function extractForms(page: Page): Promise<PageForm[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map((form) => {
      const fields = Array.from(
        form.querySelectorAll('input, select, textarea'),
      ).map((el) => {
        const input = el as HTMLInputElement;
        return {
          name: input.name ?? '',
          type: input.type ?? el.tagName.toLowerCase(),
          required: input.required ?? false,
          placeholder: input.placeholder ?? undefined,
          value: input.value ?? undefined,
        };
      });

      return {
        action: form.action ?? '',
        method: (form.method ?? 'GET').toUpperCase(),
        fields,
      };
    });
  });
}
