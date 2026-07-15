# Architecture

[简体中文](ARCHITECTURE_CN.md) | English

This document is the map for changing the project without having to rediscover its boundaries from `src/server.js`.

## Runtime flow

```text
environment + runtime paths
          |
          v
    initial app state
          |
          v
 HTTP hub / channel adapters -----> QQ / OneBot
          |                         iMessage
          v
 domain services -------------> memory, persona, stickers, web search
          |
          v
 infrastructure -------------> Codex CLI, files, processes, logs
```

`src/server.js` is the composition root. It wires dependencies, starts the HTTP listener and owns process shutdown. It is still a transitional monolith, not the intended home for new subsystems. New parsing, policy and persistence logic belongs in a focused module and is only wired from the composition root.

## Source layout

| Path | Responsibility | Change here when... |
| --- | --- | --- |
| `src/app/` | Application state and startup composition | changing global state shape or startup lifecycle |
| `src/channels/qq/` | QQ and OneBot transport boundary | parsing or validating incoming QQ events |
| `src/config/` | Environment normalization and runtime defaults | adding an environment variable or changing a deployment default |
| `src/qq-enhancer/` | Optional QQ reply behavior | changing context images, proactive interest or reply style |
| `src/unified-memory/` | Cross-channel memory | changing recall, storage or prompt formatting |
| `src/*.js` | Existing domain and infrastructure modules | changing the named capability while it is migrated incrementally |
| `modules/` | Platform clients and optional integrations | changing macOS UI, launchers, system control or social bridge |
| `scripts/` | Operator and deployment commands | changing checks, deployment or the `ncc` CLI |
| `test/` | Node test suite | every behavior change or extracted boundary |
| `data/` | Local persistent state | never source code; preserve across updates |
| `runtime/` | Logs, generated replies and temporary output | never source code; preserve while diagnosing |

## Dependency rules

1. Channel adapters normalize untrusted payloads before application logic sees them.
2. New environment settings go through `createEnvironmentConfig`; feature modules receive normalized values instead of reading `process.env` directly. Remaining direct reads in `server.js` are migration debt, not a pattern to copy.
3. Initial mutable state is created through `createInitialState`; tests and future embedded runtimes can obtain isolated state instances.
4. Domain modules must not start listeners, install signal handlers or terminate the process.
5. Filesystem, child-process and network side effects should sit behind a small exported function or factory so callers can test policy without performing the side effect.
6. Keep local data in `data/` and generated output in `runtime/`; do not import runtime files as source code.

## Configuration lifecycle

```text
process environment / config/local.env
                 |
                 v
       createEnvironmentConfig
                 |
                 v
          startup defaults
                 |
                 +---- data/settings.json overrides persisted settings
                 v
              app state
```

`config/local.env` is sourced by the repository `ncc start` command. A direct `npm start` only receives the caller's existing process environment. `data/settings.json` stores user-facing settings and overrides the corresponding startup defaults after it is loaded. Secrets should remain in the environment; see [Configuration](CONFIGURATION.md).

## Runtime boundaries

- **HTTP:** the dashboard and management API expose public state, maintenance status and logs. Non-loopback access is rejected unless remote binding and authentication are explicitly configured.
- **OneBot:** webhook payloads are authenticated or restricted to loopback, size-limited, normalized and deduplicated before QQ policy runs.
- **Codex:** child processes receive a controlled environment, concurrency limits and per-channel model settings.
- **Storage:** settings, memory and social state are local files. Load/save behavior should move behind repositories as it is extracted.

## Adding a feature

1. Pick the narrowest domain module. Create a directory under `src/channels/`, `src/app/` or an existing domain when the boundary is clear.
2. Add configuration in `src/config/environment.js`, including defaulting and bounds, instead of adding another direct `process.env` read to `src/server.js`.
3. Export pure parsing and policy functions separately from side-effecting functions.
4. Wire the module in `src/server.js`; keep the wiring small.
5. Add a focused `test/<capability>.test.js` file and run `npm run verify`.

## Incremental extraction roadmap

The remaining `src/server.js` code should be reduced in behavior-preserving slices:

1. Move dashboard/API route handlers into `src/channels/http/` with explicit service dependencies.
2. Move iMessage polling and sending into `src/channels/imessage/`.
3. Move OneBot API calls and QQ reply delivery into `src/channels/qq/`.
4. Move Codex CLI execution and quota discovery into `src/infrastructure/codex/`.
5. Move settings and memory persistence into repositories under `src/infrastructure/storage/`.

Each slice should keep the public API stable and land with its own regression tests. Avoid a single large file-move commit: it makes behavioral review and rollback harder.

## Change checklist

1. Identify the boundary and its untrusted inputs.
2. Preserve persisted schemas or add a compatible migration.
3. Add focused unit tests and integration coverage where side effects meet policy.
4. Run `npm run verify`.
5. Update both language versions of affected documentation and the packaged skill when operator behavior changes.
