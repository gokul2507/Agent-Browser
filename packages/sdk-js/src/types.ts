export interface SessionInfo {
  id: string;
  createdAt: string;
  lastActivity: string;
  currentUrl: string | null;
}

export interface NavigateResult {
  url: string;
  title: string;
  status: number | null;
  loadTimeMs: number;
}

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

export interface ExecuteJsResult {
  result: unknown;
  error?: string;
}

export interface ScreenshotResult {
  data: string;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure?: boolean;
  httpOnly?: boolean;
  expires?: number;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

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

export interface AIBrowserConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}
