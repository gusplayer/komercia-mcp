# Contributing

Thanks for your interest. This project is a migration tool for Komercia merchants — contributions are welcome, especially bug reports, new export tools, and documentation improvements.

---

## Setup

**Requirements:** Node 20 LTS, pnpm 9+, Docker Desktop.

```bash
git clone https://github.com/gustavomoreno/komercia-mcp.git
cd komercia-mcp

# Copy the env template and fill in your values
cp .env.example .env

pnpm install

# Start Postgres (port 5434) and run migrations
docker compose --profile deps up -d
node scripts/migrate.mjs

# Run the web app (port 4321) and MCP server (port 3001)
pnpm dev
```

You need a Komercia merchant account to exercise the tools end-to-end. For unit tests there is no need to hit Komercia — all HTTP is mocked via [MSW](https://mswjs.io/).

---

## Quality gates

Before pushing, make sure all three pass:

```bash
pnpm -r typecheck    # 0 errors required
pnpm -r lint         # 0 errors required (warnings ok)
pnpm -r test         # all tests pass
```

CI runs the same checks on every PR. The PR cannot be merged until CI is green.

---

## Workflow

1. **Open an issue first** for non-trivial changes. Describe the problem, the proposed approach, and any breaking-change implications.
2. **Branch** off `main`: `feat/short-name`, `fix/short-name`, `chore/short-name`, `docs/short-name`.
3. **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(tools): add export_blogs tool`
   - `fix(auth): handle 502 from /api/admin/tienda`
   - `docs(readme): clarify Vercel deploy steps`
4. **Rebase, don't merge** when syncing with main.
5. **Open a Pull Request**. Keep PRs focused — one logical change per PR.

---

## Testing conventions

- **Unit tests** (Vitest): co-located in `src/__tests__/` next to the code. Mock all external HTTP with MSW.
- **Smoke test** (`scripts/smoke-test.mjs`): exercises login → SSE → `tools/list` → tool call against a running stack. Run after any change to the auth or transport layer.
- **Tool tests**: inject a fake `KomerciaClientInterface` via the constructor — do not mock at the module level. Test resources separately with MSW for shape correctness.

---

## Adding a new MCP tool

1. Create `apps/mcp-server/src/tools/<name>/<name>.tool.ts` implementing `ITool` and `OnModuleInit`.
2. Add any new resource method to `packages/komercia-client/src/resources/`.
3. Register the tool provider in `apps/mcp-server/src/mcp/mcp.module.ts`.
4. Write a `description` that includes "Example prompts:" so the tool is discoverable in Claude.ai.
5. Add at least one Vitest spec covering the happy path and the auth-error path.
6. Update [`docs/tools-catalog.md`](./tools-catalog.md) with the new tool's description, parameters, and example prompts.

---

## Code style

- TypeScript strict mode — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`. No `any`.
- No comments explaining *what* the code does. Only add a comment when the *why* is non-obvious.
- Errors: throw typed errors (`TokenExpiredError`, `KomerciaApiError`, etc.). Do not throw plain strings.
- Tool `execute()` methods must never throw — catch all errors and return a user-facing message.
- Imports: external → `@komercia-mcp/*` → `./…` → `import type { … }`.

---

## Security

Do not open a public issue for security vulnerabilities. See [SECURITY.md](../SECURITY.md) for the responsible disclosure process.

---

## License

By contributing, you agree that your contributions are licensed under the MIT License (see [LICENSE](../LICENSE)).
