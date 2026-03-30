# AI Browser

An AI-agent-friendly browser built on [Lightpanda](https://github.com/lightpanda-io/browser) and Chromium. Enables AI agents to navigate, extract, and interact with the web through **28 MCP tools**, a **REST API**, and **JS/Python SDKs**.

```
                  Claude Code / Python agents / JS agents / curl
                       |           |              |          |
                      MCP      REST API          SDK       Dashboard
                    (stdio)    (HTTP)        (in-process)   (HTML)
                       |           |              |          |
                       +-----+-----+--------------+----------+
                             |
                      packages/core
                     BrowserEngine (pluggable)
                     SessionManager
                     PageController
                             |
               ┌─────────────┴─────────────┐
               │                           │
          Lightpanda                   Chromium
       (fast, lightweight)         (full browser)
        Simple pages, docs       Heavy SPAs, OAuth
```

## Features

- **Dual engine** — Lightpanda for speed, Chromium for heavy SPAs (Zoho, Salesforce, etc.)
- **Navigate** to any URL with full JavaScript execution
- **Extract** structured content: clean text, links, tables, forms, metadata
- **SPA-optimized interactions** — click by text, drag-and-drop, scroll to text, keyboard keys
- **Smart fill** for shadow DOM and custom web components (lyte-input, etc.)
- **Interactive element discovery** — find all clickable elements with bounding boxes
- **Execute JavaScript** in the browser context
- **Take screenshots** of pages or elements
- **Cookie import/export** — log in once, export cookies, let the agent use your session (no password sharing)
- **Multiple concurrent sessions** with automatic idle cleanup
- **Web dashboard** for visual monitoring and interactive control
- **API key authentication** and **rate limiting** for production deployments

## Dual Engine Architecture

Choose the right engine per session:

| | Lightpanda | Chromium |
|---|---|---|
| Speed | ~34ms per page | ~3s per page |
| Memory | ~50MB | ~300-500MB |
| Simple sites | Yes | Yes |
| Heavy SPAs | Crashes | Yes |
| OAuth/interceptors | No | Yes |
| When to use | Docs, news, scraping, simple forms | Zoho, Salesforce, Google apps, complex JS |

```typescript
// Fast — Lightpanda (default)
create_session({ engine: "lightpanda" })

// Heavy SPA — Chromium
create_session({ engine: "chromium" })

// Auto — tries Lightpanda, falls back to Chromium
create_session({ engine: "auto" })
```

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Install

```bash
git clone https://github.com/your-org/ai-browser.git
cd ai-browser
pnpm install
pnpm build
```

Lightpanda binary is downloaded to `~/.cache/lightpanda-node/lightpanda` and Chrome to `~/.cache/puppeteer/chrome/` during install.

### Start the API server

```bash
# Start with defaults (localhost:3000)
node packages/api/dist/index.js

# Or with custom config
API_PORT=3001 API_KEY=my-secret node packages/api/dist/index.js

# Development mode (auto-reload)
pnpm --filter @ai-browser/api dev
```

### Open the Dashboard

Visit `http://localhost:3000/dashboard` to see the visual monitoring UI with session list, content viewer, interactive console, and screenshots.

When using the MCP server, the dashboard starts automatically on port 3000 and shares the same session manager — all MCP-created sessions appear on the dashboard in real-time.

## Usage

### MCP Server (Claude Code)

Add to your `.mcp.json` or Claude Desktop config:

```json
{
  "mcpServers": {
    "ai-browser": {
      "command": "node",
      "args": ["/path/to/ai-browser/packages/mcp-server/dist/index.js"]
    }
  }
}
```

The MCP server automatically starts a dashboard at `http://localhost:3000/dashboard`.

Then use tools like:

```
create_session({ engine: "chromium" })     → for heavy SPAs
navigate({ sessionId, url })               → go to URL
get_content({ sessionId })                 → extract structured content
click_by_text({ sessionId, text: "Next" }) → click by visible text
smart_fill({ sessionId, selector, value }) → fill custom components
drag_and_drop({ sessionId, from, to })     → drag elements
press_key({ sessionId, key: "Enter" })     → keyboard input
wait_for_network_idle({ sessionId })       → wait for SPA transitions
screenshot({ sessionId })                  → capture page
```

### REST API

```bash
# Create a Chromium session (for heavy SPAs)
curl -X POST http://localhost:3000/sessions \
  -H 'Content-Type: application/json' \
  -d '{"engine":"chromium"}'

# Navigate
curl -X POST http://localhost:3000/sessions/SESSION_ID/navigate \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'

# Get structured content
curl http://localhost:3000/sessions/SESSION_ID/content

# Click by text
curl -X POST http://localhost:3000/sessions/SESSION_ID/click-by-text \
  -H 'Content-Type: application/json' \
  -d '{"text":"Submit"}'

# Get all interactive elements
curl http://localhost:3000/sessions/SESSION_ID/interactive-elements

# Execute JavaScript
curl -X POST http://localhost:3000/sessions/SESSION_ID/execute \
  -H 'Content-Type: application/json' \
  -d '{"expression":"() => document.title"}'

# Import cookies from file (login without sharing password)
curl -X POST http://localhost:3000/sessions/SESSION_ID/cookies/import-file \
  -H 'Content-Type: application/json' \
  -d '{"filePath":"/path/to/cookies.json"}'

# Destroy session
curl -X DELETE http://localhost:3000/sessions/SESSION_ID
```

### JavaScript/TypeScript SDK

```bash
npm install @ai-browser/sdk
```

```typescript
import { AIBrowser } from '@ai-browser/sdk';

const browser = new AIBrowser('http://localhost:3000');
const session = await browser.createSession();

const nav = await session.navigate('https://news.ycombinator.com');
console.log(`Loaded: ${nav.title} in ${nav.loadTimeMs}ms`);

const content = await session.getContent();
console.log(content.text);
console.log(`Found ${content.links.length} links`);

await session.destroy();
```

### Python SDK

```bash
pip install ai-browser
```

```python
import asyncio
from ai_browser import AIBrowser

async def main():
    async with AIBrowser("http://localhost:3000") as browser:
        session = await browser.create_session()

        nav = await session.navigate("https://news.ycombinator.com")
        print(f"Loaded: {nav.title} in {nav.load_time_ms}ms")

        content = await session.get_content()
        print(content.text)
        print(f"Found {len(content.links)} links")

        await session.destroy()

asyncio.run(main())
```

## Cookie Import (No Password Sharing)

Log in once in your real browser, export cookies, and let the agent use your session:

1. Log in to the target site in your browser
2. Open DevTools Console and paste:

```javascript
(() => {
  const cookies = document.cookie.split(';').map(c => {
    const [name, ...rest] = c.trim().split('=');
    return { name, value: rest.join('='), domain: window.location.hostname, path: '/', secure: true };
  });
  const blob = new Blob([JSON.stringify({ cookies }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `cookies-${window.location.hostname}.json`; a.click();
})();
```

3. Import into AI Browser:

```bash
# Via MCP tool
import_cookies_from_file({ sessionId, filePath: "/path/to/cookies.json" })

# Via REST API
curl -X POST localhost:3000/sessions/ID/cookies/import-file \
  -H 'Content-Type: application/json' \
  -d '{"filePath":"/path/to/cookies.json"}'
```

Supported formats: JSON (EditThisCookie, DevTools), Netscape cookie.txt (curl, wget). Auto-detected.

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/dashboard` | Web monitoring dashboard |
| **Sessions** | | |
| `POST` | `/sessions` | Create session (`{"engine": "chromium"}`) |
| `GET` | `/sessions` | List all active sessions |
| `GET` | `/sessions/:id` | Get session info (includes engine type) |
| `DELETE` | `/sessions/:id` | Destroy a session |
| **Navigation** | | |
| `POST` | `/sessions/:id/navigate` | Navigate to URL |
| `POST` | `/sessions/:id/back` | Go back in history |
| `POST` | `/sessions/:id/forward` | Go forward in history |
| `POST` | `/sessions/:id/reload` | Reload current page |
| **Content** | | |
| `GET` | `/sessions/:id/content` | Full structured content (text, links, tables, forms, metadata) |
| `GET` | `/sessions/:id/text` | Clean text only |
| `GET` | `/sessions/:id/links` | All page links |
| `GET` | `/sessions/:id/tables` | Parsed HTML tables |
| `GET` | `/sessions/:id/metadata` | Page metadata and OpenGraph tags |
| **Actions** | | |
| `POST` | `/sessions/:id/click` | Click element by CSS selector |
| `POST` | `/sessions/:id/click-by-text` | Click by visible text content |
| `POST` | `/sessions/:id/click-at` | Click at x,y coordinates |
| `POST` | `/sessions/:id/fill` | Clear and fill an input field |
| `POST` | `/sessions/:id/smart-fill` | Fill with shadow DOM / custom component support |
| `POST` | `/sessions/:id/type` | Type text character by character |
| `POST` | `/sessions/:id/select` | Select dropdown option(s) |
| `POST` | `/sessions/:id/scroll` | Scroll page or element |
| `GET` | `/sessions/:id/interactive-elements` | Discover all clickable/focusable elements |
| **SPA Tools** | | |
| `POST` | `/sessions/:id/wait-for-selector` | Wait for element to appear |
| `POST` | `/sessions/:id/wait-for-idle` | Wait for network idle |
| **JavaScript** | | |
| `POST` | `/sessions/:id/execute` | Execute JS in page context |
| **Screenshots** | | |
| `GET` | `/sessions/:id/screenshot` | Capture page or element |
| **Cookies** | | |
| `GET` | `/sessions/:id/cookies` | Get all cookies |
| `POST` | `/sessions/:id/cookies` | Set cookies |
| `DELETE` | `/sessions/:id/cookies` | Clear all cookies |
| `POST` | `/sessions/:id/cookies/import` | Import cookies from JSON/Netscape string |
| `POST` | `/sessions/:id/cookies/import-file` | Import cookies from local file |
| `GET` | `/sessions/:id/cookies/export` | Export cookies (JSON or Netscape format) |

### MCP Tools (28 tools)

| Tool | Description |
|------|-------------|
| **Sessions** | |
| `create_session` | Create session with engine choice: `lightpanda`, `chromium`, or `auto` |
| `list_sessions` | List all active sessions with engine type |
| `destroy_session` | Destroy a session and free resources |
| **Navigation** | |
| `navigate` | Navigate to a URL |
| `go_back` / `go_forward` / `reload` | History navigation |
| **Content Extraction** | |
| `get_content` | Extract full structured content (text, links, tables, forms, metadata) |
| `get_text` | Extract visible text only |
| `get_links` | Extract all links with resolved URLs |
| `get_tables` | Extract HTML tables as structured arrays |
| `get_metadata` | Extract page metadata |
| **Actions** | |
| `click` | Click element by CSS selector |
| `click_by_text` | Click by visible text (returns element info). Supports `containerSelector` to scope search. |
| `click_at_coordinates` | Click at x,y pixel position |
| `fill` | Clear and fill input field |
| `smart_fill` | Fill with shadow DOM traversal + JS injection (for custom components) |
| `type_text` | Type text with simulated keystrokes |
| `select_option` | Select dropdown value |
| `scroll` | Scroll page or element |
| `drag_and_drop` | Drag from selector/coords to selector/coords |
| `press_key` | Press keyboard key or combo (Enter, Escape, Tab, Ctrl+A) |
| `scroll_to_text` | Scroll until text is visible (handles nested containers) |
| `get_interactive_elements` | Discover all clickable elements with text, type, selector, bounding box |
| **Wait Utilities** | |
| `wait_for_selector` | Wait for element to appear in DOM |
| `wait_for_network_idle` | Wait until no network requests for 500ms |
| **JavaScript** | |
| `execute_js` | Execute JavaScript expression in page context |
| **Screenshots** | |
| `screenshot` | Capture page or element as base64 image |
| **Cookies** | |
| `import_cookies_from_file` | Import cookies from local JSON/Netscape file |
| `import_cookies_from_json` | Import cookies from JSON string |
| `export_cookies` | Export cookies (optionally save to file) |
| `get_cookies` | Get all cookies for current page |
| `clear_cookies` | Clear all cookies |

### Structured Output Format

Every extraction returns agent-friendly JSON:

```json
{
  "url": "https://example.com/",
  "title": "Example Domain",
  "text": "Example Domain\nThis domain is for use in illustrative examples...",
  "metadata": {
    "description": "Example domain for documentation",
    "ogTitle": "Example Domain"
  },
  "links": [
    { "text": "More information", "href": "https://www.iana.org/domains/example" }
  ],
  "tables": [
    { "headers": ["Name", "Value"], "rows": [["foo", "bar"]] }
  ],
  "forms": [
    { "action": "/search", "method": "GET", "fields": [
      { "name": "q", "type": "text", "required": true, "placeholder": "Search..." }
    ]}
  ]
}
```

### Interactive Elements Format

`get_interactive_elements` returns:

```json
[
  { "index": 1, "tag": "a", "type": "link", "text": "Hacker News", "selector": "a:nth-of-type(2)", "rect": { "x": 35, "y": 12, "width": 90, "height": 16 } },
  { "index": 2, "tag": "input", "type": "input[text]", "text": "", "placeholder": "Search", "selector": "#search", "rect": { "x": 500, "y": 10, "width": 200, "height": 30 } }
]
```

### Click by Text Response

`click_by_text` returns info about what was clicked:

```json
{
  "clicked": true,
  "tag": "a",
  "text": "new",
  "selector": "a",
  "rect": { "x": 138, "y": 12, "width": 27, "height": 16 }
}
```

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LIGHTPANDA_HOST` | `127.0.0.1` | Lightpanda server host |
| `LIGHTPANDA_PORT` | `9222` | Lightpanda server port |
| `CHROMIUM_PATH` | *(auto-detected)* | Path to Chrome/Chromium binary |
| `CHROMIUM_HEADLESS` | `true` | Run Chromium in headless mode |
| `DEFAULT_ENGINE` | `lightpanda` | Default engine: `lightpanda`, `chromium`, or `auto` |
| `DASHBOARD_PORT` | `3000` | Dashboard port (when running via MCP server) |
| `API_HOST` | `127.0.0.1` | API server bind host |
| `API_PORT` | `3000` | API server port |
| `API_KEY` | *(empty)* | API key for authentication (disabled if empty) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in milliseconds |
| `LOG_LEVEL` | `info` | Log level: debug, info, warn, error, silent |

### Authentication

When `API_KEY` is set, all requests (except `/health`) require authentication:

```bash
# Via Authorization header
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3000/sessions

# Via X-API-Key header
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:3000/sessions
```

## Docker

### Docker Compose (recommended)

```bash
# Start Lightpanda + API server
docker compose up

# With authentication
API_KEY=my-secret docker compose up

# Detached
docker compose up -d
```

### Docker only

```bash
# Build
docker build -t ai-browser .

# Run (requires external Lightpanda instance)
docker run -p 3000:3000 -e LIGHTPANDA_HOST=host.docker.internal ai-browser
```

## Project Structure

```
ai-browser/
├── packages/
│   ├── core/                 # Dual engine (Lightpanda + Chromium), SessionManager, PageController
│   ├── api/                  # REST API server (Fastify) + Dashboard
│   ├── mcp-server/           # MCP server for Claude Code (28 tools) + embedded dashboard
│   └── sdk-js/               # TypeScript SDK
├── sdks/
│   └── python/               # Python SDK (httpx + pydantic)
├── examples/
│   ├── basic-navigation.ts   # Navigate and extract content
│   ├── data-extraction.ts    # Scrape structured data
│   ├── form-interaction.ts   # Fill forms and click buttons
│   ├── js-execution.ts       # Run custom JavaScript
│   ├── multi-session.ts      # Parallel browsing
│   ├── export-cookies.html   # Cookie export helper page
│   ├── mcp-config.json       # Example MCP configuration
│   └── python-agent/         # Python research agent example
├── Dockerfile                # Multi-stage production build
├── docker-compose.yml        # Lightpanda + API services
└── .github/workflows/ci.yml  # CI pipeline
```

### Packages

| Package | Description |
|---------|-------------|
| `@ai-browser/core` | Dual browser engine (Lightpanda + Chromium), session management, page control, content extraction, SPA actions, cookie utilities |
| `@ai-browser/api` | REST API with 30+ endpoints, auth, rate limiting, logging, dashboard |
| `@ai-browser/mcp-server` | MCP server with 28 tools + embedded dashboard for Claude Code |
| `@ai-browser/sdk` | TypeScript SDK wrapping the REST API |
| `ai-browser` (Python) | Python SDK with async support and Pydantic models |

## Examples

All examples require the API server running: `node packages/api/dist/index.js`

### Basic Navigation

```bash
npx tsx examples/basic-navigation.ts
```

```typescript
import { AIBrowser } from '@ai-browser/sdk';

const browser = new AIBrowser('http://localhost:3000');
const session = await browser.createSession();

const result = await session.navigate('https://example.com');
console.log(`Loaded "${result.title}" in ${result.loadTimeMs}ms`);

const content = await session.getContent();
console.log(content.text);

for (const link of content.links) {
  console.log(`  ${link.text} -> ${link.href}`);
}

await session.destroy();
```

### Data Extraction

```bash
npx tsx examples/data-extraction.ts
```

```typescript
const session = await browser.createSession();
await session.navigate('https://news.ycombinator.com');

const links = await session.getLinks();
const stories = links.filter(l => l.href.startsWith('http') && l.text);
for (const story of stories.slice(0, 10)) {
  console.log(`${story.text} — ${story.href}`);
}

const count = await session.executeJs('() => document.querySelectorAll(".athing").length');
console.log(`Total posts: ${count.result}`);
await session.destroy();
```

### Form Interaction

```bash
npx tsx examples/form-interaction.ts
```

```typescript
const session = await browser.createSession();
await session.navigate('https://en.wikipedia.org');
await session.fill('#searchInput', 'Artificial Intelligence');
await session.click('button[type="submit"]');
const text = await session.getText();
console.log(text.substring(0, 500));
await session.destroy();
```

### Multi-Session (Parallel Browsing)

```bash
npx tsx examples/multi-session.ts
```

```typescript
const urls = ['https://example.com', 'https://news.ycombinator.com', 'https://en.wikipedia.org'];
const results = await Promise.all(
  urls.map(async (url) => {
    const session = await browser.createSession();
    const nav = await session.navigate(url);
    const text = await session.getText();
    await session.destroy();
    return { title: nav.title, loadTimeMs: nav.loadTimeMs, textLength: text.length };
  }),
);
```

### Python Agent

```bash
python examples/python-agent/example.py
```

```python
async with AIBrowser("http://localhost:3000") as browser:
    session = await browser.create_session()
    await session.navigate("https://en.wikipedia.org/wiki/Artificial_intelligence")
    content = await session.get_content()
    print(content.title, content.text[:500])
    await session.destroy()
```

### MCP Config

```json
{
  "mcpServers": {
    "ai-browser": {
      "command": "node",
      "args": ["/path/to/ai-browser/packages/mcp-server/dist/index.js"],
      "env": {
        "LIGHTPANDA_HOST": "127.0.0.1",
        "LIGHTPANDA_PORT": "9222",
        "DASHBOARD_PORT": "3000"
      }
    }
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type-check all packages
pnpm -r exec tsc --noEmit

# Development mode (auto-reload API server)
pnpm --filter @ai-browser/api dev
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Browser engines | [Lightpanda](https://lightpanda.io) (fast) + Chromium (full) |
| Browser control | puppeteer-core (CDP protocol) |
| REST API | Fastify |
| MCP server | @modelcontextprotocol/sdk |
| Validation | Zod |
| JS SDK | TypeScript, native fetch |
| Python SDK | httpx, Pydantic |
| Build | tsup, pnpm workspaces |
| Testing | Vitest |
| CI/CD | GitHub Actions |
| Containerization | Docker, Docker Compose |
