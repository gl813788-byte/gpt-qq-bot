<div align="center">

# Codex QQ Bot

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
npx -y "codex-qq-bot@$(npm view codex-qq-bot@latest version --prefer-online)"
# or
pnpm dlx "codex-qq-bot@$(npm view codex-qq-bot@latest version --prefer-online)"
```

If Node.js is not installed yet, use the lightweight bootstrap command:

```bash
curl -fsSL https://raw.githubusercontent.com/gl813788-byte/codex-qq-bot/main/install.sh | bash
# with wget only:
wget -qO- https://raw.githubusercontent.com/gl813788-byte/codex-qq-bot/main/install.sh | bash
```

The Chinese installer refreshes the repository default branch and exact latest commit on every run, resumes or downloads that commit's source ZIP, validates it, and installs it into a stable directory without waiting for a GitHub Release. The outer download does not require Node.js, npm, Git, or zsh, can use either `curl` or `wget`, and installs missing extraction/checksum tools through the host package manager. If an otherwise valid source ZIP unexpectedly lacks `一键部署.command`, the installer reconstructs that launcher from the core deployment scripts and continues. Completed stages for the same commit are reused; damaged cached downloads are quarantined and fetched again, and extraction always uses a clean temporary directory. The default is `/root/Codex-QQ-Bot` for root and `~/Codex-QQ-Bot` for other users; an existing legacy `Codex-Remote-Contact` directory is reused. When preparation finishes, run `ncc` as prompted: its first run bootstraps the environment, verifies the project, and guides configuration; later runs open the normal daily menu.

A prior archive installation without Git is upgraded through a prepared replacement that carries forward `data`, `runtime`, local configuration, and extra files, then retains the complete pre-upgrade directory under the install cache's `backups/` directory. Identical source is not reinstalled. A Git worktree and an unrelated occupied directory are never overwritten, nor is a different existing global `ncc`; in that conflict case the repository launcher is printed instead. The command resolves the registry's exact current version with `npm view` before asking npx to execute that immutable version, bypassing a stale `_npx` executable cache. Add `--check` to the end for a read-only preflight that resolves the current default-branch commit without downloading or changing project files. On Windows, run the installer inside WSL.

## Alternatively, let Codex deploy it

If you want Codex to also operate OneBot startup, post-scan connection, and final acceptance, give it the prompt below. Codex should inspect the host, preserve existing configuration, install dependencies, verify the repository, start the Hub, and isolate only the steps that require you, such as scanning a QQ login QR code or supplying a missing credential.

Copy the whole prompt into Codex:

```text
Deploy Codex QQ Bot on this machine:
https://github.com/gl813788-byte/codex-qq-bot.git

Goal: connect QQ / OneBot to the current Codex CLI login and start a locally accessible Hub and dashboard.

Execute the deployment instead of only giving me a command list. Continue until the result is verifiable:
1. Inspect the OS, CPU architecture, Git, Node.js, npm, zsh, curl, Codex CLI, any existing OneBot/NapCat installation, and any existing ncc command. Require Node.js 20 or newer.
2. Clone into a stable directory when the project is absent. Use /root/Codex-QQ-Bot for a Linux root environment; otherwise choose an appropriate user directory. Reuse an existing legacy /root/Codex-Remote-Contact installation instead of forcing a migration. Inspect the remote, branch, and worktree first. Never overwrite local changes, configuration, data, or runtime state.
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

The launcher enters the repository `ncc`, whose menus and prompts are in Chinese. On the first run, the bootstrap installs certificates, download/extraction tools, Git, zsh, screen, Node.js 20+, npm, Codex CLI, and project dependencies. Node uses a SHA-256-verified official v22 binary in an isolated user directory, avoiding obsolete distribution packages. On apt-get/dnf Linux (x64/arm64), it also invokes the official NapCat installer for LinuxQQ, NapCat, Xvfb, and runtime libraries by default; existing NapCat/OneBot installations are reused. It then runs `npm run verify` and guides owner QQ, allowlist, OneBot, branding, and web-lookup configuration. Existing `data/settings.json`, `config/local.env`, and unrelated global `ncc` commands are preserved.

The repository does not redistribute QQ/NapCat binaries; supported Linux hosts retrieve them through NapCat's official installer and Tencent's official download. The initial QQ QR scan still requires the user. macOS, Arch, and custom OneBot hosts retain the compatible manual OneBot path. Set `CODEX_QQ_BOT_INSTALL_NAPCAT=required` to fail early when mandatory automatic NapCat installation is unsupported.

## What you need

| Requirement | Purpose |
| --- | --- |
| Codex | Performs deployment, changes, diagnosis, and model work. Open the project with Codex CLI, the IDE extension, or the desktop app. |
| Bash plus a supported package manager and administrator access | Starts bootstrap; remaining base tools are installed automatically. WSL is recommended on Windows. |
| Node.js 20+, zsh, and Codex CLI | Installed automatically by one-click deployment. |
| QQ plus a OneBot implementation | apt-get/dnf Linux installs official NapCat/LinuxQQ by default; compatible existing OneBot bridges are reused. |
| Owner QQ id and allowed group ids | Used for authority and group allowlisting; provide them when deployment reaches that step. |
| About 3GB free memory | Recommended when QQ, OneBot, the Hub, and Codex run together. |

For Codex CLI, the standard sign-in path is `codex login` followed by the browser flow; API-key login is also supported. See the [official Codex authentication documentation](https://learn.chatgpt.com/docs/auth).

## What the project does

```text
QQ / NapCat / OneBot
          |
          v
       Codex QQ Bot Hub --------> local dashboard
          |
          +-----> Codex CLI / current login and models
          +-----> QQ memory, persona, interest, and stickers
          +-----> web search, logs, and maintenance state
          +-----> browser and macOS dashboard clients
```

Core capabilities:

- QQ group and private chat with mentions, replies, pokes, images, files, forwarded messages, cards, and multi-bubble output.
- Agent-style Codex replies that can use bounded chat-history, search, memory, and management tools over multiple rounds.
- Adaptive social behavior for message length, group rhythm, stickers, and voluntary replies; a higher-temperature interest model owns ordinary, cold-group and private proactive gates, while the approved main model focuses on chat, topic selection and multi-round research. The interest model is limited to bounded lightweight decisions, classification and triage. Conversation, impression and persona summaries, knowledge extraction, and other long-context or complex work remain main-model tasks; complex background review uses interest triage followed by main-model final review.
- Layered memory: `/记忆` is current-scope short-term memory cleared by `/新对话`; the titled long-term knowledge base updates older facts and supports scoped slang, frequency tracking and model-approved deletion, alongside social impressions and unified cross-channel memory.
- QQ administration for model/reasoning choice, allowlists, permissions, bans, moderation, requests, and selected QQ Space actions.
- Seven-view local dashboard for runtime, channels, behavior, short-term memory, an editable long-term Knowledge workspace, structured logs, themes, and optional LAN access.
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
