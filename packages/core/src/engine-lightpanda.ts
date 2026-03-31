import { lightpanda } from '@lightpanda/browser';
import puppeteer, { type Browser } from 'puppeteer-core';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { BrowserEngine } from './engine.js';
import { type BrowserConfig, DEFAULT_BROWSER_CONFIG } from './types.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export class LightpandaEngine implements BrowserEngine {
  readonly name = 'lightpanda';
  private config: BrowserConfig;
  private process: ChildProcessWithoutNullStreams | null = null;
  private _isRunning = false;

  constructor(config: Partial<BrowserConfig> = {}) {
    this.config = { ...DEFAULT_BROWSER_CONFIG, ...config };
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get wsEndpoint(): string {
    return `ws://${this.config.host}:${this.config.port}`;
  }

  async start(): Promise<void> {
    if (this._isRunning) return;

    // Suppress Lightpanda's console.info to avoid polluting stdout
    // (critical when running under MCP stdio transport)
    const origInfo = console.info;
    console.info = (...args: unknown[]) => console.error(...args);
    try {
      this.process = await lightpanda.serve({
        host: this.config.host,
        port: this.config.port,
      });
    } finally {
      console.info = origInfo;
    }

    this.process.on('exit', (code) => {
      if (this._isRunning && code !== 0) {
        this._isRunning = false;
        this.process = null;
        setTimeout(() => this.start().catch(() => {}), RETRY_DELAY_MS);
      }
    });

    this._isRunning = true;

    // Wait for Lightpanda to be ready to accept connections
    await this.waitForReady();
  }

  private async waitForReady(): Promise<void> {
    const { createConnection } = await import('node:net');
    for (let i = 0; i < 20; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const socket = createConnection(this.config.port, this.config.host, () => {
            socket.destroy();
            resolve();
          });
          socket.on('error', reject);
          socket.setTimeout(200, () => { socket.destroy(); reject(new Error('timeout')); });
        });
        return; // Connected — Lightpanda is ready
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  async connect(): Promise<Browser> {
    if (!this._isRunning) await this.start();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await puppeteer.connect({ browserWSEndpoint: this.wsEndpoint });
      } catch (err: any) {
        const msg = err?.message ?? (typeof err === 'string' ? err : JSON.stringify(err));
        lastError = new Error(msg);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          if (!this._isRunning) await this.start();
        }
      }
    }

    throw new Error(
      `Failed to connect to Lightpanda after ${MAX_RETRIES} attempts: ${lastError?.message}`,
    );
  }

  async stop(): Promise<void> {
    if (!this._isRunning || !this.process) return;

    this._isRunning = false;
    this.process.stdout?.destroy();
    this.process.stderr?.destroy();
    this.process.kill();
    this.process = null;
  }
}
