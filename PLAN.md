# AI Browser — Project Plan

> An AI-agent-friendly browser built on top of [Lightpanda](https://github.com/nicepkg/lightpanda), enabling AI agents to interact with the web through MCP, REST API, and SDKs.

## Architecture

```
┌──────────────────────────────────────────────┐
│  Consumers (Claude Code, Python/JS agents)   │
└────┬──────────┬──────────────┬───────────────┘
     │ MCP      │ REST API     │ SDK
     │ (stdio)  │ (HTTP)       │ (in-process)
┌────▼──────────▼──────────────▼───────────────┐
│  mcp-server   │   api        │   sdk-js      │
│  (Phase 3)    │  (Phase 2)   │  (Phase 4)    │
└───────────────┴──────┬───────┴───────────────┘
                       │
            ┌──────────▼──────────┐
            │   packages/core     │  ← Phase 1
            │   BrowserManager    │
            │   SessionManager    │
            │   PageController    │
            └──────────┬──────────┘
                       │ puppeteer-core (CDP)
            ┌──────────▼──────────┐
            │   Lightpanda        │
            │   ws://127.0.0.1    │
            └─────────────────────┘
```

## Tech Stack

| Layer | Package | Rationale |
|---|---|---|
| Browser control | `puppeteer-core` | CDP client, connects to Lightpanda without bundled Chromium |
| Lightpanda process | `@lightpanda/browser` | Official npm package for binary download + process spawning |
| REST API | `fastify` | Fast, schema validation, TypeScript-first |
| Validation | `zod` | Required by MCP SDK, used throughout for consistency |
| MCP Server | `@modelcontextprotocol/server` | Official MCP TypeScript SDK (stdio + HTTP transports) |
| Monorepo | `pnpm` workspaces | Fast, disk-efficient, strict dependency resolution |
| Build | `tsup` | Zero-config TypeScript bundler, ESM + CJS output |
| Testing | `vitest` | Fast, native ESM, TypeScript-first |
| Python SDK | `httpx` + `pydantic` | Async HTTP client + type validation |
| Linting | `biome` | Single tool for lint + format |

## Monorepo Structure

```
ai-browser/
├── package.json                  # Root workspace config
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── .env.example
│
├── packages/
│   ├── core/                     # Browser engine abstraction over Lightpanda
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts          # Public API barrel export
│   │       ├── browser.ts        # BrowserManager: spawn/connect to Lightpanda
│   │       ├── session.ts        # SessionManager: concurrent session lifecycle
│   │       ├── page.ts           # PageController: navigate, interact, extract
│   │       ├── extractor.ts      # Content extraction: text, tables, links, structured
│   │       ├── actions.ts        # Click, fill, type, select, scroll
│   │       ├── javascript.ts     # JS execution wrapper
│   │       ├── cookies.ts        # Cookie/auth management
│   │       ├── screenshots.ts    # Screenshot capture
│   │       └── types.ts          # Shared TypeScript types
│   │
│   ├── api/                      # REST API layer (Fastify)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts          # Server entrypoint
│   │       ├── app.ts            # Fastify app setup
│   │       ├── routes/
│   │       │   ├── sessions.ts   # POST/DELETE /sessions
│   │       │   ├── navigate.ts   # POST /sessions/:id/navigate
│   │       │   ├── content.ts    # GET /sessions/:id/content
│   │       │   ├── actions.ts    # POST /sessions/:id/click, /fill, /type
│   │       │   ├── javascript.ts # POST /sessions/:id/execute
│   │       │   ├── cookies.ts    # GET/POST /sessions/:id/cookies
│   │       │   └── screenshots.ts
│   │       └── middleware/
│   │           ├── error-handler.ts
│   │           └── validation.ts
│   │
│   ├── mcp-server/               # MCP Server for Claude Code / LLM tools
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts          # MCP server entrypoint (stdio transport)
│   │       ├── server.ts         # McpServer setup + tool registration
│   │       └── tools/
│   │           ├── navigate.ts
│   │           ├── content.ts
│   │           ├── actions.ts
│   │           ├── javascript.ts
│   │           ├── sessions.ts
│   │           └── screenshots.ts
│   │
│   └── sdk-js/                   # JS/TS SDK (wraps REST API)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── client.ts         # AIBrowserClient class
│           ├── session.ts        # Session class with fluent API
│           └── types.ts
│
├── sdks/
│   └── python/                   # Python SDK
│       ├── pyproject.toml
│       └── src/
│           └── ai_browser/
│               ├── __init__.py
│               ├── client.py
│               ├── session.py
│               └── types.py
│
└── examples/
    ├── basic-navigation.ts
    ├── data-extraction.ts
    ├── mcp-config.json
    └── python-agent/
        └── example.py
```

## Phases

### Phase 1: Core + Smoke Test

**Goal**: Connect to Lightpanda, navigate to a page, extract content. Prove the plumbing works.

**What gets built**:

- Root workspace setup (package.json, pnpm-workspace.yaml, tsconfig, .gitignore)
- `packages/core` with all source files:
  - **`browser.ts`** — `BrowserManager` class
    - `start()`: calls `lightpanda.serve({ host, port })` to spawn process
    - `connect()`: calls `puppeteer.connect({ browserWSEndpoint })` to get a `Browser`
    - `stop()`: kills process
  - **`session.ts`** — `SessionManager` class
    - `createSession()`: connects to Lightpanda, returns session ID + Browser
    - `getSession(id)`: retrieves active session
    - `destroySession(id)`: closes browser, cleans up
    - Session idle timeout with automatic cleanup
  - **`page.ts`** — `PageController` class (wraps a Puppeteer `Page`)
    - `navigate(url, waitUntil)`: goes to URL, returns page info
    - `getContent()`: returns `PageContent` (text, metadata, links, tables)
    - `screenshot()`: returns base64 PNG
  - **`extractor.ts`** — Content extraction logic
    - `extractText(page)`: clean text content
    - `extractLinks(page)`: all links with text
    - `extractTables(page)`: HTML tables into arrays
    - `extractMetadata(page)`: meta tags
  - **`actions.ts`** — Basic interaction
    - `click(selector)`, `fill(selector, value)`, `type(selector, text)`
  - **`types.ts`** — All shared TypeScript interfaces
- Smoke test: `packages/core/tests/smoke.test.ts`

**Key types**:

```typescript
interface BrowserConfig {
  host: string;
  port: number;
  obeyRobots: boolean;
  maxConnections: number;
}

interface SessionInfo {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  currentUrl: string;
}

interface NavigateResult {
  url: string;
  title: string;
  status: number;
  loadTime: number;
}

interface PageContent {
  url: string;
  title: string;
  text: string;
  metadata: {
    description?: string;
    author?: string;
    publishedDate?: string;
  };
  links: Array<{ text: string; href: string }>;
  tables: Array<{ headers: string[]; rows: string[][] }>;
  forms: Array<{ action: string; method: string; fields: FormField[] }>;
}
```

**Total: 15 files**

---

### Phase 2: REST API

**Goal**: HTTP interface to all core capabilities.

- `packages/api/` with Fastify
- Routes map 1:1 to core methods
- OpenAPI spec auto-generated from Fastify schemas
- Session ID in URL path (`/sessions/:id/...`)
- Consistent JSON error format

**API endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create a new browser session |
| DELETE | `/sessions/:id` | Destroy a session |
| GET | `/sessions/:id` | Get session info |
| POST | `/sessions/:id/navigate` | Navigate to URL |
| GET | `/sessions/:id/content` | Get structured page content |
| GET | `/sessions/:id/links` | Get page links |
| GET | `/sessions/:id/tables` | Get page tables |
| POST | `/sessions/:id/click` | Click an element |
| POST | `/sessions/:id/fill` | Fill an input |
| POST | `/sessions/:id/type` | Type text |
| POST | `/sessions/:id/execute` | Execute JavaScript |
| GET | `/sessions/:id/cookies` | Get cookies |
| POST | `/sessions/:id/cookies` | Set cookies |
| GET | `/sessions/:id/screenshot` | Take screenshot |

---

### Phase 3: MCP Server

**Goal**: Claude Code can use AI Browser as a tool directly.

- `packages/mcp-server/` using `@modelcontextprotocol/server`
- `StdioServerTransport` for local usage
- Imports from `@ai-browser/core` directly (no HTTP overhead)
- Tools: `navigate`, `get_content`, `get_links`, `get_tables`, `click`, `fill`, `execute_js`, `screenshot`, `create_session`, `destroy_session`
- Example `claude_desktop_config.json` for setup

---

### Phase 4: SDKs

**Goal**: Ergonomic clients for agent frameworks.

**JS/TS SDK** (`packages/sdk-js/`):

```typescript
import { AIBrowser } from '@ai-browser/sdk';

const browser = new AIBrowser('http://localhost:3000');
const session = await browser.createSession();

await session.navigate('https://example.com');
const content = await session.getContent();
console.log(content.text);

await session.destroy();
```

**Python SDK** (`sdks/python/`):

```python
from ai_browser import AIBrowser

async with AIBrowser("http://localhost:3000") as browser:
    session = await browser.create_session()
    await session.navigate("https://example.com")
    content = await session.get_content()
    print(content.text)
```

---

### Phase 5: Production Hardening

- Connection pooling and reconnection logic
- Request queuing for concurrent access
- Lightpanda Cloud support (`wss://` endpoints)
- Authentication / API keys for the REST API
- Docker Compose setup (Lightpanda + AI Browser API)
- CI/CD pipeline
- Rate limiting and request throttling
- Logging and observability

## Design Principles

1. **Core is the single source of truth** — Both MCP server and REST API are thin wrappers around `packages/core`. No business logic in the API layer.
2. **Agent-friendly output** — Every extraction returns structured JSON, never raw HTML. Clean text, typed metadata, parsed tables.
3. **Session-based** — Each agent gets an isolated session with its own browser context, cookies, and state.
4. **Local-first, service-ready** — Runs on `localhost` today, deployable with auth and Docker tomorrow.
5. **Leverage Lightpanda** — Use built-in features like `--dump markdown` and `--dump semantic_tree` where possible instead of reimplementing in JS.
