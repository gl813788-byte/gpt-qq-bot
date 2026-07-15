# Repository guidance for Codex

## Purpose

This repository runs a local Hub between QQ/OneBot and Codex CLI. Treat it as a stateful local service: code can be replaced deliberately, but user configuration, runtime data, login state and secrets must be preserved.

## Read before changing

- Start with `README_CN.md` or `README.md`.
- Use `docs/ARCHITECTURE_CN.md` or `docs/ARCHITECTURE.md` for source boundaries.
- Use `docs/CONFIGURATION_CN.md` or `docs/CONFIGURATION.md` before changing settings or environment variables.
- Use `docs/OPERATIONS_CN.md` or `docs/OPERATIONS.md` for deployment and process behavior.
- For local NapCat/QQ bridge operations, also read `skills/claude-to-im/SKILL.md` when that skill applies.

## Structural boundaries

- `src/server.js` is a transitional composition root. Wire modules there, but do not add new parsing, validation, policy or persistence subsystems to it.
- Put environment parsing and deployment defaults in `src/config/`.
- Put application state construction and startup composition in `src/app/`.
- Normalize untrusted transport input in `src/channels/` before domain logic consumes it.
- Keep domain behavior in focused existing modules such as `src/qq-enhancer/` and `src/unified-memory/`.
- Keep network, filesystem and child-process side effects behind small exported interfaces.
- Prefer small behavior-preserving extractions with focused tests over broad file moves.

## Safety and local state

- Preserve a dirty worktree. Do not use `git reset --hard`, `git clean`, forced checkout or deletion as an update strategy.
- Never delete or overwrite `data/`, `runtime/`, local databases, `config/local.env`, login files or untracked state unless the user explicitly asks.
- Do not commit secrets, tokens, cookies, QR codes, chat logs or private message data.
- Keep the Hub on loopback by default. Remote binding requires explicit user intent, an API token and restricted CORS.
- Do not weaken OneBot webhook authentication, owner checks, group allowlists or local-file marker validation.

## Verification

- Node.js 20 or newer is required.
- Run `npm run verify` after code changes.
- Add or update focused tests for behavior changes; extracted pure boundaries should be directly unit tested.
- For deployment changes, also verify `/api/state`, `/api/maintenance`, the dashboard and OneBot `/get_login_info` when those services are available.

## Documentation and skill sync

- Keep Chinese and English documentation structurally equivalent when behavior changes.
- When deployment, QQ bridge or operator behavior changes, update both `skills/claude-to-im/SKILL.md` and the installed operational copy when it exists and is in scope.
- Commands in public documentation must work from the repository. Prefer `npm run ncc -- <command>` over assuming a global `ncc`, because a machine may already have a different NapCat controller with the same name.
