import type { Page, Browser } from 'puppeteer-core';

// ── Engine ──

export type EngineType = 'lightpanda' | 'chromium' | 'auto';

// ── Browser Configuration ──

export interface BrowserConfig {
  host: string;
  port: number;
  maxConnections?: number;
}

export interface ChromiumConfig {
  headless?: boolean;
  executablePath?: string;
  args?: string[];
}

export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  host: '127.0.0.1',
  port: 9222,
  maxConnections: 16,
};

export const DEFAULT_CHROMIUM_CONFIG: ChromiumConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--ignore-certificate-errors',
    '--disable-gpu',
  ],
};

// ── Session ──

export interface SessionInfo {
  id: string;
  engine: EngineType;
  createdAt: Date;
  lastActivity: Date;
  currentUrl: string | null;
}

export interface Session {
  id: string;
  engine: EngineType;
  browser: Browser;
  pages: Map<string, Page>;
  createdAt: Date;
  lastActivity: Date;
}

export interface SessionManagerConfig {
  idleTimeoutMs?: number;
  maxSessions?: number;
  defaultEngine?: EngineType;
}

export const DEFAULT_SESSION_CONFIG: Required<SessionManagerConfig> = {
  idleTimeoutMs: 5 * 60 * 1000, // 5 minutes
  maxSessions: 16,
  defaultEngine: 'lightpanda',
};

// ── Navigation ──

export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  timeout?: number;
}

export interface NavigateResult {
  url: string;
  title: string;
  status: number | null;
  loadTimeMs: number;
}

// ── Content Extraction ──

export interface PageMetadata {
  description?: string;
  author?: string;
  publishedDate?: string;
  ogTitle?: string;
  ogImage?: string;
}

export interface PageLink {
  text: string;
  href: string;
}

export interface PageTable {
  headers: string[];
  rows: string[][];
}

export interface FormField {
  name: string;
  type: string;
  required: boolean;
  placeholder?: string;
  value?: string;
}

export interface PageForm {
  action: string;
  method: string;
  fields: FormField[];
}

export interface PageContent {
  url: string;
  title: string;
  text: string;
  metadata: PageMetadata;
  links: PageLink[];
  tables: PageTable[];
  forms: PageForm[];
}

// ── Actions ──

export interface ClickOptions {
  selector: string;
  timeout?: number;
}

export interface FillOptions {
  selector: string;
  value: string;
  timeout?: number;
  /** Use JS injection to bypass shadow DOM / custom component wrappers */
  force?: boolean;
}

export interface TypeOptions {
  selector: string;
  text: string;
  delay?: number;
  timeout?: number;
}

export interface SelectOptions {
  selector: string;
  values: string[];
  timeout?: number;
}

export interface ScrollOptions {
  direction?: 'up' | 'down';
  amount?: number;
  selector?: string;
}

// ── JavaScript Execution ──

export interface ExecuteJsOptions {
  expression: string;
  args?: unknown[];
}

export interface ExecuteJsResult {
  result: unknown;
  error?: string;
}

// ── Screenshots ──

export interface ScreenshotOptions {
  fullPage?: boolean;
  type?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  selector?: string;
}

export interface ScreenshotResult {
  data: string; // base64 encoded
  mimeType: string;
  width?: number;
  height?: number;
}

// ── Cookies ──

export interface CookieParam {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expires?: number;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface Cookie extends CookieParam {
  domain: string;
  path: string;
}

// ── Interactive Elements ──

export interface InteractiveElement {
  index: number;
  tag: string;
  type: string;
  text: string;
  placeholder: string;
  selector: string;
  rect: { x: number; y: number; width: number; height: number };
}

export interface ClickByTextResult {
  clicked: boolean;
  tag: string;
  text: string;
  selector: string;
  rect: { x: number; y: number; width: number; height: number };
}

// ── Console Messages ──

export interface ConsoleMessage {
  type: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace';
  text: string;
  timestamp: number;
  url?: string;
  lineNumber?: number;
}

// ── Network Requests ──

export interface NetworkRequest {
  url: string;
  method: string;
  resourceType: string;
  status: number | null;
  statusText: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseSize: number | null;
  timing: number | null;
  failed: boolean;
  failureText?: string;
}

export interface NetworkFilter {
  urlPattern?: string;
  resourceType?: string;
  method?: string;
  statusCode?: number;
  failed?: boolean;
  excludeStatic?: boolean;
}

// ── Dialog ──

export interface DialogInfo {
  type: 'alert' | 'confirm' | 'prompt' | 'beforeunload';
  message: string;
  defaultValue?: string;
}

// ── Viewport ──

export interface ViewportSize {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

// ── Accessibility ──

export interface AccessibilityNode {
  role: string;
  name: string;
  value?: string;
  description?: string;
  checked?: boolean | 'mixed';
  disabled?: boolean;
  expanded?: boolean;
  focused?: boolean;
  level?: number;
  selected?: boolean;
  children?: AccessibilityNode[];
}

// ── Tabs ──

export interface TabInfo {
  index: number;
  url: string;
  title: string;
  active: boolean;
}

// ── File Upload ──

export interface FileUploadOptions {
  selector: string;
  filePaths: string[];
  timeout?: number;
}
