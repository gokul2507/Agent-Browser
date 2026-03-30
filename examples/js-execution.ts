/**
 * JavaScript Execution — Run custom JS in the browser context.
 *
 * Run: npx tsx examples/js-execution.ts
 * Requires: API server running on localhost:3000
 */
import { AIBrowser } from '@ai-browser/sdk';

const browser = new AIBrowser('http://localhost:3000');
const session = await browser.createSession();

await session.navigate('https://news.ycombinator.com');
console.log('Loaded Hacker News\n');

// Get the page title
const title = await session.executeJs('() => document.title');
console.log('Title:', title.result);

// Count elements
const count = await session.executeJs('() => document.querySelectorAll("a").length');
console.log('Total links:', count.result);

// Extract custom data with a complex expression
const topStories = await session.executeJs(`
  () => Array.from(document.querySelectorAll('.titleline > a')).slice(0, 5).map(a => ({
    title: a.textContent,
    url: a.href
  }))
`);
console.log('\nTop 5 stories (via custom JS):');
for (const story of topStories.result as any[]) {
  console.log(`  ${story.title}`);
  console.log(`    ${story.url}`);
}

// Math in browser context
const math = await session.executeJs('2 ** 10');
console.log('\n2^10 =', math.result);

// Error handling
const err = await session.executeJs('() => undefinedVar.foo');
console.log('\nError example:', err.error);

await session.destroy();
