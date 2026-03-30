/**
 * Form Interaction — Search Wikipedia using form controls.
 *
 * Run: npx tsx examples/form-interaction.ts
 * Requires: API server running on localhost:3000
 */
import { AIBrowser } from '@ai-browser/sdk';

const browser = new AIBrowser('http://localhost:3000');
const session = await browser.createSession();

// Go to Wikipedia
await session.navigate('https://en.wikipedia.org');
console.log('Loaded Wikipedia');

// Fill the search box and submit
await session.fill('#searchInput', 'Artificial Intelligence');
console.log('Filled search box');

await session.click('button[type="submit"]');
console.log('Clicked search button');

// Wait a moment for navigation, then extract content
const text = await session.getText();
console.log('\n--- First 500 chars of result ---');
console.log(text.substring(0, 500));

// Get all section links
const links = await session.getLinks();
const sectionLinks = links.filter(l => l.href.includes('#') && l.text);
console.log(`\n--- ${sectionLinks.length} section links found ---`);
for (const link of sectionLinks.slice(0, 10)) {
  console.log(`  ${link.text}`);
}

await session.destroy();
