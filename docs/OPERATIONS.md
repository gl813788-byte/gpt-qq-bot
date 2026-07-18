# Operations and Troubleshooting

[简体中文](OPERATIONS_CN.md) | English

For a fresh install or installer update, prefer `npx -y "codex-qq-bot@$(npm view codex-qq-bot@latest version --prefer-online)"` (or the same exact-version pattern with `pnpm dlx`) so npm resolves the registry version first instead of reusing an old `_npx` executable, or let Codex execute and validate the [deployment guide](DEPLOY_WITH_CODEX.md). This page covers routine operation after deployment.

The public installer refreshes the latest commit on the repository's default branch every time and reuses only valid stages for the same commit. A damaged ZIP is quarantined and fetched again, and extraction starts in a clean temporary directory. A prior archive install without Git is replaced with prepared new source while carrying forward `data`, `runtime`, local configuration, and extra files; the full old directory remains under the install cache's `backups/`, while Git worktrees are not overwritten. The installer creates an `ncc` entry when there is no same-name command conflict and then tells the user to run `ncc`; it does not enter the wizard by default. An extracted source archive can run the root-level `一键部署.command` directly. The first repository-`ncc` run performs environment checks, dependency installation, verification, and guided configuration. After completion, later runs open the normal status, startup, configuration, and logging menu.

```bash
./一键部署.command
```

## Distinguish the two `ncc` commands

| Entry | Purpose | Common commands |
| --- | --- | --- |
| `npm run ncc -- <command>` | Public repository setup/status helper | `setup`, `status`, `codex-login`, `qq`, `owner`, `groups`, `branding`, `search-config`, `start`, `open`, `logs` |
| Global `ncc` | A machine-specific NapCat + Hub lifecycle controller | Run `ncc help` first; this machine may offer `all`, `napcat`, `hub`, `connect`, `stop-hub` |

Public instructions use `npm run ncc -- ...` so deployment does not overwrite an existing global controller with the same name.

## Preflight

```bash
cd /root/Codex-QQ-Bot
node --version
codex --version
git status --short --branch
npm run verify
npm run ncc -- status
```

Require Node.js 20+, a zero verification exit code and readable configuration. A running process alone does not prove that Hub or OneBot is usable.

## Starting

### Let Codex start it

```text
Inspect and start Codex QQ Bot using docs/OPERATIONS.md. Distinguish the global ncc from the repository helper, preserve existing data/runtime/config and Git changes, and do not reset the worktree. After startup, verify the Hub, dashboard, OneBot get_login_info, QQ channel and error logs. Pause only if I must scan a QR code, then continue connection and acceptance testing.
```

### Repository entry

```bash
npm run ncc -- setup
npm run ncc -- start
```

- Linux: loads `config/local.env`, then runs `npm start` in the foreground. Stop with `Ctrl+C`.
- macOS: may use the project's launchd launcher.
- Direct `npm start`: does not source `config/local.env`; export variables in the current shell first.

For a long-running service, let Codex reuse the machine's established systemd, screen, launchd or container setup. Before adding a manager, document its working directory, environment source, logs and restart policy, then test a restart.

### Machine-specific full stack

If `ncc help` identifies the local NapCat controller:

```bash
ncc status
ncc all
ncc connect
```

`ncc all` starts NapCat and Hub. After the user scans QQ, Codex runs `ncc connect`. Do not mix arguments between the global and repository controllers.

## Restart catch-up for recurring behavior

Recurring QQ domain work is based on timestamps saved in local state, not on how long the Node.js process has stayed alive. Hub startup immediately checks adaptive style reviews and self-persona summary/generation. Enabling the QQ channel immediately checks restored ordinary-interest cycles plus cold-group and private-interest due times. The normal poll then continues as a wake-up mechanism.

If the machine was off past a deadline, only one overdue run is performed. A restored ordinary-interest cycle is allowed to reach its catch-up judge even when the saved candidate is older than the normal online stale-topic limit; this one-time exception prevents a long shutdown from silently consuming the overdue check, while activity arriving during the judge still supersedes the result. A successful, silent, declined or failed completed check writes its completion timestamp according to that feature's retry policy, and the next interval starts there. Missed intervals are not replayed one by one, so recovery cannot produce a message burst. `/api/state` exposes the safe scheduler snapshot at `qq.periodic`; ordinary pending-cycle state is persisted inside `data/qq-memory.json`. Unified-memory reads/writes and manual chat summaries are event-driven and have no periodic deadline to catch up.

## Acceptance checks

```bash
curl -fsS --max-time 3 http://127.0.0.1:3789/api/state | jq .
curl -fsS --max-time 3 http://127.0.0.1:3789/api/maintenance | jq .
curl -fsS --max-time 3 -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1:3789/
curl -fsS --max-time 3 http://127.0.0.1:3000/get_login_info | jq .
```

| Check | Pass condition |
| --- | --- |
| Hub | `/api/state` returns HTTP 200 JSON |
| Maintenance | `/api/maintenance` exposes valid Codex, OneBot and lookup state |
| Dashboard | `/` returns HTTP 200 HTML |
| OneBot | `/get_login_info` returns the logged-in QQ account |
| QQ channel | `channels.qq` is enabled with correct owner and allowlist |
| Logs | No unexplained fatal/error startup failure |

## OneBot connection

Defaults:

```text
OneBot API:          http://127.0.0.1:3000
Reverse HTTP target: http://127.0.0.1:3789/api/onebot/event
```

- Enable the OneBot HTTP API and reverse HTTP reporting in NapCat/LLBot.
- If an access token is configured, use the same value in Hub `ONEBOT_ACCESS_TOKEN` or `CODEX_REMOTE_CONTACT_ONEBOT_TOKEN`.
- Without a token, Hub accepts only actual loopback connections. Cross-namespace containers should use an explicit address and token, not disabled validation.
- After QR login, check `/get_login_info` again before enabling or connecting the QQ channel.

## Logs

The default JSONL file is `runtime/logs/hub.jsonl` with rotation.

Repository viewer:

```bash
npm run ncc -- logs --tail 80
npm run ncc -- logs --errors --since 30m --summary
npm run ncc -- logs --category interest --group GROUP_ID --tail 100
npm run ncc -- logs --category search --verbose --tail 100
npm run ncc -- logs --trace TRACE_ID --all
npm run ncc -- logs -f
```

Use `ncc help` for filters supported by the machine-specific controller. API examples:

```bash
curl -fsS 'http://127.0.0.1:3789/api/logs?limit=100&level=error,warn' | jq .
curl -fsS 'http://127.0.0.1:3789/api/logs?category=interest&group=GROUP_ID' | jq .
```

Useful categories include `system`, `web`, `onebot`, `qq`, `codex`, `search`, `interest`, `learning`, `memory` and `lifecycle`. Start with a trace to follow one reply through routing, judging, search, Codex and delivery.

The dashboard separates Overview, Channels, Intelligence, Memory, Live Logs and Settings instead of stacking every feature on one page. Channels only manages connections, allowlists and contacts. Intelligence displays and persistently controls the Bot enhancer, web lookup, proactive interest and judge tuning, with safe diagnostics for OpenRouter, search provider, safe-download mode, active generations and pending replies. Behavior state uses independent desktop columns so a tall persona card does not leave a large hole in the other column, then returns to a natural single-column order on narrow screens.

The polling renderer separates server state from local interaction state. It does not replace active switches, an in-flight group/memory/network operation, a dirty Bot-settings form, or the open/closed state of memory and adaptive-learning details with a stale poll response. Reload recovery is session-scoped to the same browser tab and covers Bot-setting and group-input drafts, memory browsing context, adaptive-learning expansion state, and log controls/position; it does not synchronize drafts between tabs. Failed Bot-setting saves retain the draft for retry, while successful saves clear it.

The browser Live Logs view fetches complete structured entries every second, keeps chronological order and follows the latest row by default. Level, category, trace, error, outcome and latency have distinct colors, and every `details` field is visible inline. Operators can pause live refresh, turn off follow mode, change the row limit, filter entries and click a row for raw JSON. Requests pause while the page is hidden.

Interactive terminal output uses stable, independent colors for level, category, trace, outcome/error and latency. Use `--color` to force ANSI outside a TTY, `--plain` to disable it and `--json` for raw machine-readable fields. The Chinese viewer and dashboard share Chinese event names while JSON retains the original English `message` and the API adds `messageZh`. Human output folds multiline values onto one line; Codex child failures retain extracted diagnostic lines instead of copying the complete input prompt into the error log.

## Safe Hub restart

1. Inspect `/api/state`, the dashboard and recent lifecycle logs for active work.
2. Stop only Hub; do not stop QQ/NapCat for a code or dashboard change.
3. Start Hub through the existing process manager.
4. Repeat Hub, dashboard, OneBot, QQ-channel and error-log checks.

When supported by the global controller:

```bash
ncc stop-hub
ncc hub
ncc status
```

For the public foreground Linux path, press `Ctrl+C` and run `npm run ncc -- start` again.

## Safe upgrade

```text
Safely upgrade the current Codex QQ Bot. Inspect the Git worktree, active replies, data/runtime, databases and local environment first. Do not reset, clean or overwrite local changes. Use only a fast-forward update when the worktree permits it. Install dependencies, run npm run verify, restart only Hub through the existing process manager, and verify /api/state, dashboard, OneBot, QQ channel and error logs. Preserve user data and report any recovery or blocker explicitly.
```

Manual inspection order:

```bash
git status --short --branch
git remote -v
git pull --ff-only
npm install
npm run verify
```

Do not pull directly over local changes; let Codex assess conflicts and update strategy.

## Common failures

| Symptom | Likely cause | Check and action |
| --- | --- | --- |
| Nothing listens on `3789` | Hub stopped, syntax/config failure or port conflict | Run `npm run verify`; inspect `system` logs and `ss -ltnp | rg ':3789'` |
| API works but dashboard is 404/stale | Asset not registered or old process cache | Check `src/dashboard-assets.js` and `modules/mac-client/Resources`; restart only Hub |
| NapCat WebUI works but `3000` does not | QQ not logged in or OneBot HTTP config not loaded | Inspect WebUI/QR and NapCat logs; run `ncc connect` after login |
| `get_login_info` returns 401/403 | Token mismatch | Align OneBot and Hub tokens without printing them |
| QQ channel is false | OneBot unavailable, channel disabled or state not saved | Inspect state, settings and `ncc connect` |
| Allowlisted group does not reply | Wrong group, no mention/reply, or sender banned | Inspect state plus `qq` and `onebot` logs |
| Codex generation fails | Login, CLI path, model access or queue pressure | Check CLI/version/login, maintenance and `codex` logs |
| Proactive interest stays silent | Empty cycle, disabled/failed judge, low interest or stale result | Inspect `interest` logs, OpenRouter credential, judge policy and group activity |
| QQ images report `URL_PRIVATE_ADDRESS` and DNS returns `198.18/15` | Proxy software uses Fake-IP DNS and strict safe-download mode blocks the reserved address | Keep private-address protection and set `CODEX_REMOTE_CONTACT_SAFE_FETCH_MODE=proxy-compatible`, then restart only Hub; literal private IPs and other reserved ranges remain blocked |
| Web lookup fails | Credential, provider, network or timeout | Inspect maintenance provider attempts and `search` logs |
| `ncc` rejects a documented command | Wrong same-name controller | Inspect `command -v ncc`, `readlink -f`, `ncc help`; use `npm run ncc --` for repository commands |
| Dead screen socket | Previous abnormal exit | Confirm no live process, run `screen -wipe`, then restart |

## Temporary public access

The Settings page has a default-off **Temporary public access** switch backed by [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/). It keeps the Hub on `127.0.0.1` and starts a local `cloudflared` child process that forwards only to `http://127.0.0.1:3789`.

Before enabling it, install `cloudflared` using Cloudflare's platform instructions and make sure the executable is on the PATH inherited by the Hub. The dashboard never installs or downloads the dependency. If it is missing, fails to start, or does not return a URL within the startup timeout, the API returns an error and no public URL is retained.

When enabled:

1. The Hub creates a persistent management token if one does not already exist.
2. The dashboard displays the active random `https://*.trycloudflare.com` URL. The address can change after a restart or re-enable.
3. Send the address and token separately to a trusted visitor. The visitor enters the token in the dashboard prompt; it is stored only in that browser tab.
4. Every non-loopback management API request still requires the token. Same-origin CORS is admitted only for the exact active tunnel host.
5. Only a loopback-loaded dashboard can start or stop the tunnel or retrieve the token. Disabling the switch terminates the child process.

The desired switch state is persisted, so an enabled tunnel is recreated when the Hub restarts. Quick Tunnels are intended for temporary development/testing, not durable production exposure. For a stable public service, use a managed named tunnel or TLS reverse proxy with independent identity controls, rate limits and monitoring.

## LAN access

The default remains `127.0.0.1`. Enable LAN only on explicit request:

1. Use the loopback dashboard switch, or configure an explicit host, `ALLOW_REMOTE=1` and a random API token.
2. Restrict CORS; never use unauthenticated `*`.
3. Limit firewall access to required private subnets and bypass private addresses in proxy/VPN rules.
4. Test the page and token-authenticated API from another device, and confirm the token is absent from Git, logs and screenshots.
5. For durable public access, use a managed named tunnel or TLS reverse proxy with authentication and rate limits; do not bind Hub directly to the public internet.
