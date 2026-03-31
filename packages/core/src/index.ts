// Core classes
export { BrowserManager, LightpandaEngine, ChromiumEngine, createEngine } from './browser.js';
export type { BrowserEngine } from './browser.js';
export { SessionManager } from './session.js';
export type { SessionManagerEngineConfig } from './session.js';
export { PageController } from './page.js';

// Extractor functions
export {
  extractContent,
  extractText,
  extractLinks,
  extractTables,
  extractMetadata,
  extractForms,
} from './extractor.js';

// Action functions
export {
  click,
  fill,
  type,
  select,
  scroll,
  clickByText,
  clickAtCoordinates,
  getInteractiveElements,
  waitForSelector,
  waitForNetworkIdle,
  dragAndDrop,
  pressKey,
  scrollToText,
} from './actions.js';

// Advanced functions
export {
  hover,
  setViewport,
  getViewport,
  startConsoleCapture,
  startNetworkCapture,
  setupDialogHandler,
  uploadFile,
  getAccessibilitySnapshot,
  listTabs,
  switchTab,
  openNewTab,
  closeTab,
  batchFill,
  waitForTextGone,
  evaluateOnElement,
  saveToFile,
  saveJsonToFile,
} from './advanced.js';

// Types
export type {
  BrowserConfig,
  ChromiumConfig,
  EngineType,
  SessionInfo,
  Session,
  SessionManagerConfig,
  NavigateOptions,
  NavigateResult,
  PageMetadata,
  PageLink,
  PageTable,
  FormField,
  PageForm,
  PageContent,
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
  ConsoleMessage,
  NetworkRequest,
  NetworkFilter,
  DialogInfo,
  ViewportSize,
  AccessibilityNode,
  TabInfo,
  FileUploadOptions,
  BatchFillField,
} from './types.js';

// Cookie utilities
export {
  exportCookiesToJson,
  importCookiesFromJson,
  exportCookiesToNetscape,
  importCookiesFromNetscape,
  saveCookiesToFile,
  loadCookiesFromFile,
  injectCookiesIntoPage,
  extractCookiesFromPage,
} from './cookies.js';
export type { CookieJar } from './cookies.js';

// Defaults
export { DEFAULT_BROWSER_CONFIG, DEFAULT_CHROMIUM_CONFIG, DEFAULT_SESSION_CONFIG } from './types.js';
