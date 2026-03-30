# Contributing to AI Browser

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/gokul2507/Agent-Browser.git
cd Agent-Browser

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Project Structure

- `packages/core` — Browser engine abstraction (Lightpanda + Chromium)
- `packages/api` — REST API server + Dashboard
- `packages/mcp-server` — MCP server (28 tools for Claude Code)
- `packages/sdk-js` — TypeScript SDK
- `sdks/python` — Python SDK

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes in the relevant package under `packages/` or `sdks/`
3. Run `pnpm build` to verify everything compiles
4. Run `pnpm test` to ensure tests pass
5. Type-check with `pnpm -r exec tsc --noEmit`
6. Submit a pull request

## Adding a New MCP Tool

1. Add the core logic in `packages/core/src/actions.ts` or `packages/core/src/page.ts`
2. Export it from `packages/core/src/index.ts`
3. Add the MCP tool in `packages/mcp-server/src/tools/`
4. Register it in `packages/mcp-server/src/server.ts`
5. Add the REST endpoint in `packages/api/src/routes/`
6. Update the README with the new tool

## Adding a New REST Endpoint

1. Create or update a route file in `packages/api/src/routes/`
2. Register it in `packages/api/src/app.ts`
3. Update the README

## Code Style

- TypeScript for all Node.js code
- ESM modules (`type: "module"`)
- No unnecessary abstractions — keep it simple
- Return structured JSON, never raw HTML
- Handle errors gracefully — return error objects, don't crash

## Reporting Issues

Use [GitHub Issues](https://github.com/gokul2507/Agent-Browser/issues) with the appropriate template:
- **Bug Report** — something broken
- **Feature Request** — new tool or capability
- **SPA Compatibility** — site that doesn't work correctly

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
