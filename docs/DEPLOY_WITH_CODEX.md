# Deploy with Codex

English | [简体中文](DEPLOY_WITH_CODEX_CN.md)

## Why Codex should operate the deployment

This project spans Node.js, Codex authentication, QQ/OneBot, local configuration, process lifecycle, and network checks. The public installer and repository `ncc` preserve existing configuration, but host paths, OneBot implementations, and process supervisors may still differ. Codex can inspect the machine first, then choose the smallest safe and verifiable actions.

A reliable deployment prompt includes a goal, host/repository context, constraints, and a definition of done, following the [official Codex prompting best practices](https://learn.chatgpt.com/guides/best-practices).

## Before you start

1. Install Codex CLI, the IDE extension, or the desktop app using the [Codex quickstart](https://learn.chatgpt.com/docs/quickstart).
2. CLI users should run `codex login` and complete the browser flow. See [Codex authentication](https://learn.chatgpt.com/docs/auth).
3. Start Codex in a stable directory where it may write the installation. Do not run a long-lived deployment from Downloads.
4. Keep the default permissions. Let Codex request approval for downloads, system packages, elevated commands, or writes outside the workspace.

## One-line install without opening GitHub

With Node.js installed, run:

```bash
npx -y "codex-qq-bot@$(npm view codex-qq-bot@latest version --prefer-online)"
# or pnpm dlx "codex-qq-bot@$(npm view codex-qq-bot@latest version --prefer-online)"
```

Without Node.js, run:

```bash
curl -fsSL https://raw.githubusercontent.com/gl813788-byte/codex-qq-bot/main/install.sh | bash
```

The command first uses `npm view` to resolve the registry's exact current version and then asks npx/pnpm to execute that immutable version, bypassing a stale `_npx` executable cache. This Chinese bootstrap refreshes the repository default branch and exact latest commit through the GitHub API on every run, resumes that commit-pinned source ZIP download, validates the ZIP integrity and structure, and places the project in `/root/Codex-QQ-Bot` or `~/Codex-QQ-Bot`; it does not wait for a formal Release, and an existing legacy `Codex-Remote-Contact` directory is reused. Completed stages for the same commit are reused, damaged downloads are quarantined and fetched again, and extraction uses a clean temporary directory. A prior archive install without Git is upgraded while preserving `data`, `runtime`, local configuration, and extra files, with the complete old directory retained under the install cache's `backups/`; Git worktrees, unrelated non-empty directories, and different global `ncc` commands are not overwritten. After preparation it explicitly asks the user to run `ncc`, whose state machine performs environment checks, dependency installation, `npm run verify`, and guided configuration. `--check` resolves source metadata without downloading or writing project files.

## Chinese entry for existing source

When the source has already been downloaded or extracted, run:

```bash
chmod +x 一键部署.command
./一键部署.command
```

The launcher enters the repository `ncc`. On first run, `scripts/bootstrap-environment.sh` fills base commands through brew, apt-get, dnf, yum, or pacman, installs a checksum-verified official Node.js v22 binary when Node 20+ is absent, and installs Codex CLI. apt-get/dnf Linux also invokes NapCat's official rootless Shell installer by default to provide LinuxQQ, NapCat, Xvfb, and runtime libraries. It then installs project dependencies, runs full verification, and guides configuration. The flow preserves existing `data/settings.json`, `config/local.env`, and unrelated global `ncc` commands. The user must still complete the QQ QR scan.

The outer `install.sh` does not require Node, Git, or zsh. It can use curl or wget and installs missing unzip/SHA-256 tooling. If a ZIP contains the core scripts but its Chinese launcher is absent or was mishandled by an extractor, the installer reconstructs `一键部署.command` instead of aborting.

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
3. Clone into a stable path when absent. Use /root/Codex-QQ-Bot for a Linux root environment; otherwise choose a stable path under HOME; reuse an existing legacy /root/Codex-Remote-Contact installation. For an existing repository, inspect git status --short --branch, remotes, and the current branch first. Never use reset --hard, clean, forced checkout, or overwrite local files.
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

The `npx`, `pnpm dlx`, and remote `install.sh` entries resolve the default branch's current head, resumably obtain its commit-pinned source ZIP, verify and extract it, and install an `ncc` entry only when no command conflict exists. They then tell the user to run `ncc`. The repository `ncc` owns the first-run state machine: it checks tools, creates missing local files, installs npm dependencies, runs `npm run verify`, and explicitly avoids replacing an unrelated global `ncc`. After success, `ncc` becomes the normal daily control menu.

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

## Manual or offline fallback

Use this only when both the public installer and Codex are unavailable:

```bash
git clone https://github.com/gl813788-byte/codex-qq-bot.git
cd codex-qq-bot
chmod +x 一键部署.command
./一键部署.command
```

Use the launcher to install dependencies, verify, configure, and start the Hub. Then prepare OneBot and complete QQ login. See [Operations](OPERATIONS.md) for runtime diagnostics.
