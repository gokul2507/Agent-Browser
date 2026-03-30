/**
 * Data Extraction — Scrape structured data from a real website.
 *
 * Run: npx tsx examples/data-extraction.ts
 * Requires: API server running on localhost:3000
 */
import { AIBrowser } from '@ai-browser/sdk';

const browser = new AIBrowser('http://localhost:3000');
const session = await browser.createSession();

// Navigate to Hacker News
await session.navigate('https://news.ycombinator.com');

// Extract all links (these include post titles)
const links = await session.getLinks();
const stories = links.filter(l => l.href.startsWith('http') && l.text && !['new', 'past', 'comments', 'ask', 'show', 'jobs', 'submit', 'login', 'Hacker News'].includes(l.text));

console.log('--- Top Hacker News Stories ---\n');
for (const story of stories.slice(0, 10)) {
  console.log(`  ${story.text}`);
  console.log(`  ${story.href}\n`);
}

// Use JS execution to get more specific data
const postCount = await session.executeJs('() => document.querySelectorAll(".athing").length');
console.log(`Total posts on page: ${postCount.result}`);

await session.destroy();
