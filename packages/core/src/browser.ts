import type { BrowserEngine } from './engine.js';
import { LightpandaEngine } from './engine-lightpanda.js';
import { ChromiumEngine } from './engine-chromium.js';
import type { BrowserConfig, ChromiumConfig, EngineType } from './types.js';

export { LightpandaEngine } from './engine-lightpanda.js';
export { ChromiumEngine } from './engine-chromium.js';
export type { BrowserEngine } from './engine.js';

/**
 * Create a browser engine by type.
 */
export function createEngine(
  type: EngineType,
  config?: { lightpanda?: Partial<BrowserConfig>; chromium?: Partial<ChromiumConfig> },
): BrowserEngine {
  switch (type) {
    case 'lightpanda':
      return new LightpandaEngine(config?.lightpanda);
    case 'chromium':
      return new ChromiumEngine(config?.chromium);
    case 'auto':
      // Default to lightpanda — SessionManager handles fallback
      return new LightpandaEngine(config?.lightpanda);
    default:
      throw new Error(`Unknown engine type: ${type}`);
  }
}

/**
 * BrowserManager — backward-compatible wrapper.
 * Delegates to LightpandaEngine by default.
 */
export class BrowserManager extends LightpandaEngine {
  constructor(config: Partial<BrowserConfig> = {}) {
    super(config);
  }
}
