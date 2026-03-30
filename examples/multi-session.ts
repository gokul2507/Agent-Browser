/**
 * Multi-Session — Run multiple browser sessions in parallel.
 *
 * Run: npx tsx examples/multi-session.ts
 * Requires: API server running on localhost:3000
 */
import { AIBrowser } from '@ai-browser/sdk';

const browser = new AIBrowser('http://localhost:3000');

const urls = [
  'https://example.com',
  'https://news.ycombinator.com',
  'https://en.wikipedia.org',
];

console.log(`Launching ${urls.length} sessions in parallel...\n`);

// Create sessions and navigate in parallel
const results = await Promise.all(
  urls.map(async (url) => {
    const session = await browser.createSession();
    const nav = await session.navigate(url);
    const text = await session.getText();
    await session.destroy();

    return {
      url: nav.url,
      title: nav.title,
      loadTimeMs: nav.loadTimeMs,
      textLength: text.length,
    };
  }),
);

// Display results
for (const r of results) {
  console.log(`${r.title}`);
  console.log(`  URL: ${r.url}`);
  console.log(`  Load time: ${r.loadTimeMs}ms`);
  console.log(`  Text length: ${r.textLength} chars\n`);
}

// Verify all sessions cleaned up
const sessions = await browser.listSessions();
console.log(`Active sessions remaining: ${sessions.length}`);
