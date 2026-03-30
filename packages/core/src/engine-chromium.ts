import puppeteerCore, { type Browser } from 'puppeteer-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { BrowserEngine } from './engine.js';
import { type ChromiumConfig, DEFAULT_CHROMIUM_CONFIG } from './types.js';

/**
 * Chromium engine — uses a real Chrome/Chromium browser.
 * Handles heavy SPAs, full JavaScript, OAuth interceptors, etc.
 */
export class ChromiumEngine implements BrowserEngine {
  readonly name = 'chromium';
  private config: ChromiumConfig;
  private _isRunning = false;

  constructor(config: Partial<ChromiumConfig> = {}) {
    this.config = { ...DEFAULT_CHROMIUM_CONFIG, ...config };
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  async start(): Promise<void> {
    this._isRunning = true;
  }

  async connect(): Promise<Browser> {
    if (!this._isRunning) await this.start();

    const executablePath = this.config.executablePath ?? this.findChromium();

    const browser = await puppeteerCore.launch({
      headless: this.config.headless,
      executablePath,
      args: this.config.args,
    });

    return browser;
  }

  async stop(): Promise<void> {
    this._isRunning = false;
  }

  private findChromium(): string {
    // 1. Environment variable
    if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) {
      return process.env.CHROMIUM_PATH;
    }

    // 2. System Chrome (most reliable for full features)
    const systemPaths = [
      // macOS
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      // Linux
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      // Windows
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    for (const p of systemPaths) {
      if (existsSync(p)) return p;
    }

    // 3. Puppeteer's bundled Chrome for Testing
    const puppeteerCache = join(homedir(), '.cache', 'puppeteer', 'chrome');
    if (existsSync(puppeteerCache)) {
      const versions = readdirSync(puppeteerCache).sort().reverse();
      for (const ver of versions) {
        const candidates = [
          // macOS
          join(puppeteerCache, ver, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
          join(puppeteerCache, ver, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
          // Linux
          join(puppeteerCache, ver, 'chrome-linux64', 'chrome'),
          // Windows
          join(puppeteerCache, ver, 'chrome-win64', 'chrome.exe'),
        ];
        for (const c of candidates) {
          if (existsSync(c)) return c;
        }
      }
    }

    throw new Error(
      'Chrome/Chromium not found. Install Chrome or set CHROMIUM_PATH environment variable.',
    );
  }
}
