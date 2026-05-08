# Contributing to komercia-mcp

Thanks for your interest. This project is a community migration tool for Komercia merchants ahead of the platform's wind-down. Contributions are welcome — bug reports, fixes, new export tools, docs improvements.

## Code of Conduct

By participating, you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Development setup

```bash
git clone https://github.com/gustavomoreno/komercia-mcp.git
cd komercia-mcp
pnpm install

# Local dev DB (Postgres on port 5434)
docker compose --env-file .env.local --profile deps up -d postgres

# Run migrations
DATABASE_URL=$(grep ^DATABASE_URL .env.local | cut -d= -f2-) node scripts/migrate.mjs

# Run web (4321) and MCP server (3001) locally
set -a; source .env.local; set +a
pnpm dev
```

Required: Node 20 LTS, pnpm 9+, Docker Desktop.

You will need a Komercia merchant account to exercise the tools end-to-end. For local-only tests there is no need to hit Komercia (Vitest mocks via MSW).

## Project layout

```
apps/web/          Astro SSR — login UI, /api/login, /api/sessions/revoke (Vercel target)
apps/mcp-server/   NestJS — HTTP/SSE MCP server with 11 tools (Railway target)
apps/discovery/    CLI for mapping Komercia API surface

packages/shared/         Types, JWT helpers, AES-256-GCM crypto
packages/komercia-client/ HTTP client + auth resource for Laravel + NodeJS backends
packages/eslint-config/  Shared ESLint flat config

scripts/migrate.mjs       Standalone DB migration runner
scripts/smoke-test.mjs    End-to-end test against running stack
```

## Workflow

1. **Open an issue first** for non-trivial changes. Describe the problem, the proposed approach, and any breaking-change implications.
2. **Branch** off `main`: `feat/short-name`, `fix/short-name`, `chore/short-name`, `docs/short-name`.
3. **Commit messages**: [Conventional Commits](https://www.conventionalcommits.org/). Examples:
   - `feat(tools): add export_blogs tool`
   - `fix(auth): handle 502 from /api/admin/tienda`
   - `docs(readme): clarify Vercel deploy steps`
4. **Rebase, don't merge** when syncing with main.
5. **Open a Pull Request** following the [PR template](.github/PULL_REQUEST_TEMPLATE.md). Keep PRs focused — one logical change per PR.

## Quality gates

Before pushing, run:

```bash
pnpm -r typecheck    # 0 errors required
pnpm -r lint         # 0 errors required (warnings ok)
pnpm -r test         # all tests pass
```

CI runs the same checks on every PR. The PR cannot be merged until CI is green.

## Testing conventions

- **Unit tests** (vitest): co-located in `__tests__/` next to the code under test. Mock external HTTP via [MSW](https://mswjs.io/).
- **End-to-end smoke test** (`scripts/smoke-test.mjs`): exercises login → SSE → tools/list → tool call against a running stack. Run after any change to the auth or transport layer.
- **No mocking the Komercia client at the tool layer.** Tools should be testable by injecting a fake `KomerciaClient`. Test the resources directly with MSW for shape correctness.

## Code style

- TypeScript strict mode, including `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`. No `any`.
- Imports grouped: external, internal (`@komercia-mcp/*`), parent/sibling (`./...`), then `import type { ... }`.
- Public APIs (exports of any package) must have JSDoc explaining what they do and why a future reader should care. Prefer "why" over "what".
- Errors: throw typed errors (`TokenExpiredError`, `KomerciaApiError`, etc.). Do not throw plain strings.
- Tools return user-facing English text. Never leak internal stack traces.

## Adding a new MCP tool

1. Create `apps/mcp-server/src/tools/<name>/<name>.tool.ts` implementing `ITool`.
2. Add the resource method to `packages/komercia-client/src/resources/` if needed.
3. Register in `apps/mcp-server/src/mcp/mcp.module.ts`.
4. Write a description that includes "Example prompts" so users discover the tool naturally in Claude.ai.
5. Add at least one Vitest spec in `__tests__/` covering happy path + auth error path.
6. Update [`docs/tools-catalog.md`](./docs/tools-catalog.md).

## Security

If you find a vulnerability, do not open a public issue. See [SECURITY.md](./SECURITY.md) for the disclosure process.

## License

By contributing, you agree your contributions are licensed under the MIT License (see [LICENSE](./LICENSE)).
