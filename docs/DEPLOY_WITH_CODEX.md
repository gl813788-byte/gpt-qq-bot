# Deploy with Codex

English | [简体中文](DEPLOY_WITH_CODEX_CN.md)

## Why Codex should operate the deployment

This project spans Node.js, Codex authentication, QQ/OneBot, local configuration, process lifecycle, and network checks. Host paths and existing installations differ enough that a static “one-click” script can overwrite local state or report a false success. Codex can inspect the machine first, then choose the smallest safe and verifiable actions.

A reliable deployment prompt includes a goal, host/repository context, constraints, and a definition of done, following the [official Codex prompting best practices](https://learn.chatgpt.com/guides/best-practices).

## Before you start

1. Install Codex CLI, the IDE extension, or the desktop app using the [Codex quickstart](https://learn.chatgpt.com/docs/quickstart).
2. CLI users should run `codex login` and complete the browser flow. See [Codex authentication](https://learn.chatgpt.com/docs/auth).
3. Start Codex in a stable directory where it may write the installation. Do not run a long-lived deployment from Downloads.
4. Keep the default permissions. Let Codex request approval for downloads, system packages, elevated commands, or writes outside the workspace.

## Full deployment prompt

This prompt works for a fresh install or repair and can be used before the repository is cloned.

```text
Act as the deployment operator and deploy or repair Codex QQ Bot on this machine:
https://github.com/gl813788-byte/codex-qq-bot.git

Goals:
- QQ / OneBot sends work to the current Codex CLI login.
- The Hub and local dashboard start reliably.
- Existing configuration, Git changes, and runtime data are preserved.
- Completion is based on real health and test evidence, not merely a running process.

Execution requirements:
1. Inspect the OS/architecture, free disk and memory, git, node, npm, zsh, curl, codex, jq, screen/launchctl when applicable, OneBot/NapCat, and ncc. Require Node.js 20+.
2. Make a short plan and execute it. Ask me only for a QR scan, secret values, elevated/system changes, external-download approval, or a choice that changes the existing deployment strategy.
3. Clone into a stable path when absent. Use /root/Codex-Remote-Contact for a Linux root environment; otherwise choose a stable path under HOME. For an existing repository, inspect git status --short --branch, remotes, and the current branch first. Never use reset --hard, clean, forced checkout, or overwrite local files.
4. Read the README, docs/DEPLOY_WITH_CODEX*, docs/ARCHITECTURE*, root AGENTS.md, and skills/claude-to-im/SKILL.md when applicable.
5. Install dependencies and run npm run verify. Explain and fix syntax or test failures; do not skip verification.
6. Create data/settings.json from config/settings.example.json only when missing. Merge an existing file at field level. Never commit data, runtime, config/local.env, or tokens.
7. Ask for owner QQ ids, allowed groups, OneBot address, and optional search keys only when needed. Mask secrets in output.
8. Run command -v ncc, readlink, and ncc help to determine whether it is the repository helper or an existing NapCat controller. Do not replace a controller with a different command of the same name. Invoke the repository entry point as npm run ncc -- <command>.
9. Reuse an installed OneBot implementation. If none exists, select a currently supported implementation for this platform, identify the source, and request approval before downloads or system installation. Do not equate “Hub started” with “QQ connected.”
10. Start OneBot and the Hub. If QQ needs login, give me the QR URL or NapCat WebUI address and pause. After I confirm the scan, continue OneBot connection, owner, and allowlist configuration yourself.
11. Keep 127.0.0.1 defaults. Do not configure 0.0.0.0, remote management, or wildcard CORS unless I explicitly request LAN access.
12. Verify and show evidence for npm run verify, Hub /api/state, Hub /api/maintenance, dashboard GET /, OneBot /get_login_info, QQ channel enabled, persisted owner/allowlist, and recent error logs.
13. Claim completion only when every required check passes. Otherwise report the blocker, completed work, and exact next step.
```

## Expected workflow

### 1. Inventory without overwriting

Codex distinguishes a new host, a clean existing install, and an install with local changes or runtime data. Code updates must not delete `data/`, `runtime/`, untracked databases, or local environment files.

### 2. Prepare code and dependencies

The core verification is:

```bash
npm install
npm run verify
```

`npm run deploy` is an interactive preparation script. It checks tools, creates missing local files, and attempts to install an `ncc` shortcut. Codex may use it only after inspecting any existing `ncc` command.

### 3. Configure the Hub

The public repository always has an unambiguous local entry point:

```bash
npm run ncc -- status
npm run ncc -- setup
npm run ncc -- start
```

On Linux, the repository helper starts `npm start` in the foreground. For a long-lived production process, Codex may use systemd, screen, or an existing supervisor, but it must explain the choice and verify restart behavior.

### 4. Connect OneBot

QQ and NapCat binaries are not included. Codex must verify OneBot `/get_login_info`, not only an open port. A QR scan is a normal user pause; configuration and verification continue afterward.

### 5. Accept the deployment

| Check | Pass condition |
| --- | --- |
| Code | `npm run verify` exits 0 |
| Hub | `/api/state` returns HTTP 200 JSON |
| Dashboard | `/` returns HTTP 200 HTML |
| OneBot | `/get_login_info` returns the active QQ account |
| QQ channel | `channels.qq` is enabled with the intended allowlist |
| Security | Loopback default; no secrets in Git-tracked files |
| Runtime | No unexplained fatal startup errors |

## Upgrade prompt

```text
Safely upgrade this Codex QQ Bot installation. Inspect the Git worktree, active QQ generation, data/runtime, and local environment files first; preserve every local change. Use only a fast-forward update when the worktree permits it. Update dependencies, run npm run verify, and restart only the Hub through the host's existing process manager. Verify /api/state, the dashboard, OneBot, QQ channel state, and error logs. Restore service availability or stop with an explicit blocker; never reset user files.
```

## When user input is required

- Scan the QQ login QR code.
- Supply owner QQ ids, group allowlists, or a secret that does not exist yet.
- Approve system packages, OneBot downloads, system-service writes, or LAN exposure.
- Choose between strategies that materially change an existing deployment.

Codex should continue through ordinary setup and verification instead of handing the remaining commands back to the user.

## Manual fallback

Use this only when Codex is unavailable:

```bash
git clone https://github.com/gl813788-byte/codex-qq-bot.git
cd codex-qq-bot
npm install
npm run verify
npm run deploy
```

Then prepare OneBot and run `npm run ncc -- setup` and `npm run ncc -- start`. See [Operations](OPERATIONS.md) for runtime diagnostics.
