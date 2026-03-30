/**
 * Basic Navigation — Navigate to a page and extract structured content.
 *
 * Run: npx tsx examples/basic-navigation.ts
 * Requires: API server running on localhost:3000
 */
import { AIBrowser } from '@ai-browser/sdk';

const browser = new AIBrowser('http://localhost:3000');

// Create a session
const session = await browser.createSession();
console.log('Session created:', session.id);

// Navigate
const result = await session.navigate('https://example.com');
console.log(`Loaded "${result.title}" in ${result.loadTimeMs}ms`);

// Get full structured content
const content = await session.getContent();
console.log('\n--- Text ---');
console.log(content.text);

console.log('\n--- Links ---');
for (const link of content.links) {
  console.log(`  ${link.text} -> ${link.href}`);
}

console.log('\n--- Metadata ---');
console.log(content.metadata);

// Clean up
await session.destroy();
console.log('\nSession destroyed');
