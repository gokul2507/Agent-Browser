# Changelog

## v0.1.0 (2026-03-30)

Initial release.

### Core
- Dual browser engine: Lightpanda (fast, lightweight) + Chromium (heavy SPAs)
- Pluggable engine selection per session (`lightpanda`, `chromium`, `auto`)
- Session management with concurrent sessions and idle timeout cleanup
- Content extraction: text, links, tables, forms, metadata
- Browser actions: click, fill, type, select, scroll
- SPA-optimized tools: click_by_text, click_at_coordinates, drag_and_drop, press_key, scroll_to_text
- Smart fill with shadow DOM traversal for custom web components
- Interactive element discovery with bounding box coordinates
- JavaScript execution in browser context
- Screenshot capture (viewport or full page)
- Cookie import/export (JSON + Netscape format)
- Connection retry with auto-reconnect on Lightpanda crash

### MCP Server
- 28 tools for Claude Code / LLM agent integration
- StdioServerTransport for local usage
- Embedded dashboard (auto-starts on port 3000)
- Shared session manager between MCP and dashboard

### REST API
- 30+ endpoints via Fastify
- Web dashboard for visual monitoring
- API key authentication (Bearer + X-API-Key)
- Per-IP rate limiting with configurable window
- Request logging to stderr

### SDKs
- TypeScript/JavaScript SDK (`@anthropic-ai-browser/sdk`)
- Python SDK (`ai-browser-sdk`) with async support and Pydantic models

### Infrastructure
- Docker + Docker Compose support
- GitHub Actions CI pipeline
- pnpm monorepo with 4 TypeScript packages
