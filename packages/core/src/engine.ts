import type { Browser } from 'puppeteer-core';

/**
 * Common interface for browser engines.
 * Both Lightpanda and Chromium implement this.
 */
export interface BrowserEngine {
  readonly name: string;
  readonly isRunning: boolean;

  /** Start the browser engine process */
  start(): Promise<void>;

  /** Create a new CDP connection to the engine */
  connect(): Promise<Browser>;

  /** Stop the browser engine and clean up */
  stop(): Promise<void>;
}
