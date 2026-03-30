import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import type { Page } from 'puppeteer-core';
import type { Cookie, CookieParam } from './types.js';

/**
 * Cookie file format — compatible with:
 * - Netscape/Mozilla cookie.txt format (used by curl, wget, browser extensions)
 * - JSON array format (exported from browser devtools or extensions like "EditThisCookie")
 */

// ── JSON Format ──

export interface CookieJar {
  domain: string;
  exportedAt: string;
  cookies: CookieParam[];
}

export function exportCookiesToJson(cookies: Cookie[]): string {
  const domains = [...new Set(cookies.map((c) => c.domain))];
  const jar: CookieJar = {
    domain: domains.join(', '),
    exportedAt: new Date().toISOString(),
    cookies: cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      expires: c.expires,
      sameSite: c.sameSite,
    })),
  };
  return JSON.stringify(jar, null, 2);
}

export function importCookiesFromJson(json: string): CookieParam[] {
  const data = JSON.parse(json);

  // Support both CookieJar format and raw array
  if (Array.isArray(data)) {
    return data.map(normalizeCookie);
  }

  if (data.cookies && Array.isArray(data.cookies)) {
    return data.cookies.map(normalizeCookie);
  }

  throw new Error('Invalid cookie JSON format. Expected an array or { cookies: [...] }');
}

// ── Netscape Cookie.txt Format ──
// Format: domain\tflag\tpath\tsecure\texpires\tname\tvalue

export function exportCookiesToNetscape(cookies: Cookie[]): string {
  const lines = [
    '# Netscape HTTP Cookie File',
    '# Exported by AI Browser',
    '# https://github.com/nicepkg/lightpanda',
    '',
  ];

  for (const c of cookies) {
    const domain = c.domain.startsWith('.') ? c.domain : `.${c.domain}`;
    const flag = 'TRUE';
    const path = c.path || '/';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expires = c.expires ? String(Math.floor(c.expires)) : '0';
    lines.push(`${domain}\t${flag}\t${path}\t${secure}\t${expires}\t${c.name}\t${c.value}`);
  }

  return lines.join('\n') + '\n';
}

export function importCookiesFromNetscape(text: string): CookieParam[] {
  const cookies: CookieParam[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split('\t');
    if (parts.length < 7) continue;

    const [domain, , path, secure, expires, name, value] = parts;
    cookies.push({
      name,
      value,
      domain: domain.replace(/^\./, ''),
      path,
      secure: secure === 'TRUE',
      httpOnly: false,
      expires: expires !== '0' ? Number(expires) : undefined,
    });
  }

  return cookies;
}

// ── File I/O ──

export function saveCookiesToFile(cookies: Cookie[], filePath: string, format: 'json' | 'netscape' = 'json'): void {
  const content = format === 'json'
    ? exportCookiesToJson(cookies)
    : exportCookiesToNetscape(cookies);
  writeFileSync(filePath, content, 'utf-8');
}

export function loadCookiesFromFile(filePath: string): CookieParam[] {
  if (!existsSync(filePath)) {
    throw new Error(`Cookie file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8').trim();

  // Auto-detect format
  if (content.startsWith('{') || content.startsWith('[')) {
    return importCookiesFromJson(content);
  }

  // Netscape format or plain text cookie file
  return importCookiesFromNetscape(content);
}

// ── Page Helpers ──

export async function injectCookiesIntoPage(page: Page, cookies: CookieParam[]): Promise<void> {
  await page.setCookie(
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

export async function extractCookiesFromPage(page: Page): Promise<Cookie[]> {
  const cookies = await page.cookies();
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

// ── Utilities ──

function normalizeCookie(raw: Record<string, unknown>): CookieParam {
  return {
    name: String(raw.name ?? ''),
    value: String(raw.value ?? ''),
    domain: raw.domain != null ? String(raw.domain) : undefined,
    path: raw.path != null ? String(raw.path) : undefined,
    secure: raw.secure != null ? Boolean(raw.secure) : undefined,
    httpOnly: raw.httpOnly != null ? Boolean(raw.httpOnly) : raw.HttpOnly != null ? Boolean(raw.HttpOnly) : undefined,
    expires: raw.expires != null ? Number(raw.expires) : raw.expirationDate != null ? Number(raw.expirationDate) : undefined,
    sameSite: raw.sameSite != null ? String(raw.sameSite) as CookieParam['sameSite'] : undefined,
  };
}
