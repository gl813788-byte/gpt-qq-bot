<div align="center">

# Codex Remote Contact

### Connect local Codex capabilities to QQ

**A local QQ / OneBot and Codex CLI assistant hub**

[简体中文](README_CN.md) | English

![Node.js](https://img.shields.io/badge/Node.js-20+-339933)
![Linux](https://img.shields.io/badge/Linux-supported-blue)
![macOS](https://img.shields.io/badge/macOS-supported-blue)
![Windows / WSL](https://img.shields.io/badge/Windows-WSL%20recommended-blue)
![Codex](https://img.shields.io/badge/deploy%20with-Codex-111111)

</div>

---

## Easiest install: one terminal command

If Node.js is installed, run either command below. There is no need to open GitHub, download an archive, or extract it manually:

```bash
npx -y codex-qq-bot
# or
pnpm dlx codex-qq-bot
```

If Node.js is not installed yet, use the lightweight bootstrap command:

```bash
curl -fsSL https://raw.githubusercontent.com/gl813788-byte/codex-qq-bot/main/install.sh | bash
```

The Chinese installer resolves the latest GitHub Release, downloads its project ZIP, checks the SHA-256 digest supplied by GitHub, validates the archive structure, and installs it into a stable directory. The default is `/root/Codex-Remote-Contact` for root and `~/Codex-Remote-Contact` for other users. It then enters the repository `ncc`: the first run checks the environment, installs dependencies, verifies the project, and guides configuration; later runs open the normal daily menu.

An existing recognized installation is preserved, including its code, configuration, `data`, and `runtime`, and its current `ncc` is launched. An unrelated occupied directory is never overwritten. Run `npx -y codex-qq-bot --check` for a read-only preflight that downloads or changes no project files. On Windows, run the installer inside WSL.

## Alternatively, let Codex deploy it

If you want Codex to also operate OneBot startup, post-scan connection, and final acceptance, give it the prompt below. Codex should inspect the host, preserve existing configuration, install dependencies, verify the repository, start the Hub, and isolate only the steps that require you, such as scanning a QQ login QR code or supplying a missing credential.

Copy the whole prompt into Codex:

```text
Deploy Codex QQ Bot on this machine:
https://github.com/gl813788-byte/codex-qq-bot.git

Goal: connect QQ / OneBot to the current Codex CLI login and start a locally accessible Hub and dashboard.

Execute the deployment instead of only giving me a command list. Continue until the result is verifiable:
1. Inspect the OS, CPU architecture, Git, Node.js, npm, zsh, curl, Codex CLI, any existing OneBot/NapCat installation, and any existing ncc command. Require Node.js 20 or newer.
2. Clone into a stable directory when the project is absent. Use /root/Codex-Remote-Contact for a Linux root environment; otherwise choose an appropriate user directory. If it already exists, inspect the remote, branch, and worktree first. Never overwrite local changes, configuration, data, or runtime state.
3. Read README.md, docs/DEPLOY_WITH_CODEX.md, docs/ARCHITECTURE.md, and skills/claude-to-im/SKILL.md when that skill matches the environment.
4. Install dependencies and run npm run verify. Diagnose and fix failures instead of skipping verification.
5. Create data/settings.json from config/settings.example.json only when it is missing. Merge only necessary fields into an existing file. Ask me for owner QQ ids, allowed group ids, OneBot address, or secrets only when needed, and never print secrets back in full.
6. Determine whether ncc is the repository's setup helper or a separate NapCat controller by running its help first. Do not replace a working command with another command of the same name. The repository helper is always available as npm run ncc -- <command>.
7. Check OneBot. Reuse an installed NapCat/LLBot deployment. If none is installed, choose a supported OneBot implementation for the current platform and identify its source. Ask for approval before downloads, system package changes, or elevated commands.
8. Start the Hub and OneBot. If QQ login needs a QR scan, show only the QR URL or WebUI address and the shortest user action. After I confirm login, continue the connection and allowlist setup yourself.
9. Verify npm run verify, Hub /api/state, the dashboard root, OneBot get_login_info, QQ channel state, and recent error logs. Report each item separately and do not claim completion while a required component is unavailable.
10. Keep the Hub loopback-only unless I explicitly request LAN access. Never place tokens in Git-tracked files.
```

See [Deploy with Codex](docs/DEPLOY_WITH_CODEX.md) for the detailed workflow, upgrade prompt, and acceptance checklist.

## One-click file for an extracted source archive

After downloading and extracting the project, you may run the root-level `一键部署.command` as the single setup entry. Double-click it on macOS, or use a terminal on Linux / WSL:

```bash
chmod +x 一键部署.command
./一键部署.command
```

The launcher enters the repository `ncc`, whose menus and prompts are in Chinese. On the first run, `ncc` checks the host and Node.js 20+, can install missing tools and Codex CLI, installs npm dependencies, runs `npm run verify`, and guides owner QQ, allowlist, OneBot, branding, and web-lookup configuration. It then records completion in the local environment file; later `ncc` runs open the normal daily control menu. Existing `data/settings.json`, `config/local.env`, and unrelated global `ncc` commands are preserved.

QQ/NapCat binaries are not embedded in the launcher. It guides the OneBot configuration, while the initial QQ QR login still requires the user.

## What you need

| Requirement | Purpose |
| --- | --- |
| Codex | Performs deployment, changes, diagnosis, and model work. Open the project with Codex CLI, the IDE extension, or the desktop app. |
| Node.js 20+ | Runs the Hub and tests. |
| zsh | Runs the repository deployment and `ncc` helpers; WSL is recommended on Windows. |
| QQ plus a OneBot implementation | NapCat is recommended; any compatible OneBot HTTP bridge can work. QQ/NapCat binaries are not distributed here. |
| Owner QQ id and allowed group ids | Used for authority and group allowlisting; provide them when deployment reaches that step. |
| About 3GB free memory | Recommended when QQ, OneBot, the Hub, and Codex run together. |

For Codex CLI, the standard sign-in path is `codex login` followed by the browser flow; API-key login is also supported. See the [official Codex authentication documentation](https://learn.chatgpt.com/docs/auth).

## What the project does

```text
QQ / NapCat / OneBot
          |
          v
  Codex Remote Contact Hub -----> local dashboard
          |
          +-----> Codex CLI / current login and models
          +-----> QQ memory, persona, interest, and stickers
          +-----> web search, logs, and maintenance state
          +-----> browser and macOS dashboard clients
```

Core capabilities:

- QQ group and private chat with mentions, replies, pokes, images, files, forwarded messages, cards, and multi-bubble output.
- Agent-style Codex replies that can use bounded chat-history, search, memory, and management tools over multiple rounds.
- Adaptive social behavior for message length, group rhythm, stickers, and voluntary interest-based replies.
- Three memory layers: rolling conversation, social impressions/topics, and unified long-term memory, all with bounds and sensitive-data filtering.
- QQ administration for model/reasoning choice, allowlists, permissions, bans, moderation, requests, and selected QQ Space actions.
- Local dashboard for health, maintenance, memory, structured logs, themes, and optional LAN access.
- macOS client and browser dashboard use the same QQ/OneBot Hub and require no Messages database or iMessage automation permissions.

See [Features](docs/FEATURES.md) for complete boundaries.

## Common entry points after deployment

Invoke the repository helper through npm to avoid collisions with an existing system `ncc` command:

```bash
npm run ncc -- status
npm run ncc -- setup
npm run ncc -- start
npm run ncc -- logs --errors --since 30m --summary
```

If Codex finds a separate NapCat controller already installed, run `ncc help` before using it. A machine-specific controller may provide extra commands such as `ncc all`, `ncc connect`, or `ncc hub`; those commands are not a universal prerequisite of this public repository.

Default addresses:

- Dashboard: `http://127.0.0.1:3789/`
- Hub state: `http://127.0.0.1:3789/api/state`
- Maintenance: `http://127.0.0.1:3789/api/maintenance`
- OneBot: `http://127.0.0.1:3000`

## Minimal configuration

During the first deployment, Codex creates `data/settings.json` from `config/settings.example.json` only when needed. At minimum, confirm:

```json
{
  "qq": {
    "allowedGroups": ["YOUR_QQ_GROUP_ID"],
    "ownerUserIds": ["YOUR_QQ_ID"]
  },
  "branding": {
    "assistantName": "assistant",
    "ownerLabel": "owner",
    "assistantMentions": ["@assistant"]
  }
}
```

Local secrets, OneBot tokens, OpenRouter/Tavily keys, and network bindings belong in untracked environment files or the process environment. Do not commit them. See [Configuration](docs/CONFIGURATION.md) for fields and precedence.

## Repository layout

```text
src/
  app/                 initial application state and composition boundaries
  channels/qq/         untrusted QQ / OneBot transport boundary
  config/              environment defaults, validation, and normalization
  qq-enhancer/         QQ replies, images, and proactive interest
  unified-memory/      unified memory and recent Codex context
  server.js            composition root and runtime logic under gradual extraction
modules/               shared clients, launchers, and NapCat extensions
scripts/               deployment, ncc, logs, and static checks
data/                  local persistent state; most runtime files are untracked
runtime/               logs, replies, task workspaces, and generated output
test/                  Node.js regression tests
skills/                repository-distributed Codex skill
docs/                  deployment, architecture, configuration, features, and operations
```

Read [Architecture](docs/ARCHITECTURE.md) before making broad changes. Codex automatically discovers the root [AGENTS.md](AGENTS.md), which records verification, documentation-sync, and safety rules.

## Development and verification

```bash
npm install
npm run check
npm test
npm run test:coverage
npm run verify
```

Run `npm run verify` for every behavioral change. Configuration, initial state, and OneBot event normalization have focused tests; keep adding testable modules instead of expanding `src/server.js`.

## Documentation

- [Deploy with Codex](docs/DEPLOY_WITH_CODEX.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Configuration](docs/CONFIGURATION.md)
- [Features](docs/FEATURES.md)
- [Operations, logs, and troubleshooting](docs/OPERATIONS.md)
- [简体中文](README_CN.md)

## Security

- The Hub binds to loopback by default. Remote access must be explicitly enabled with a management token and should sit behind a TLS reverse proxy with access control.
- Never commit `data/settings.json`, `config/local.env`, tokens, cookies, QR codes, logs, or runtime databases.
- OneBot callbacks, owner authority, and local-file markers have separate validation. Do not remove those boundaries for convenience.
- The macOS client is only a native wrapper for the same dashboard; macOS-only proxy, display, keep-awake and desktop-control features are not part of the project.
- This is a local automation tool, not a hosted public Bot service.
