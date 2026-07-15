# Configuration Reference

[简体中文](CONFIGURATION_CN.md) | English

The project separates persistent user settings from secrets and process startup parameters. When deploying or editing configuration, let Codex inspect the machine and merge individual fields instead of replacing whole files.

## Sources and precedence

```text
process environment
    -> normalized startup defaults in src/config/environment.js
    -> persisted fields overridden by data/settings.json
    -> runtime changes saved atomically by the dashboard or QQ commands
```

- `npm run ncc -- start` sources `config/local.env` first.
- A direct `npm start` does not load that file; it only inherits the current process environment.
- A machine-specific global `ncc` may instead use `/root/.napcat-codex-control.env` and `/root/.codex/ncc-profiles/active.env`. Run `ncc help` before assuming its command surface.
- `data/settings.json` overrides corresponding startup defaults such as models, allowlists and proactive-reply switches.
- Keep OneBot, management API, OpenRouter and Tavily secrets in an untracked environment file.

## Files

| File | Purpose | Commit? |
| --- | --- | --- |
| `config/settings.example.json` | Persistent schema and example | Yes |
| `data/settings.json` | This machine's settings, permissions and network state | No |
| `config/local.env` | Environment and secrets used by repository `ncc start` | No; mode `600` recommended |
| `src/config/environment.js` | Authoritative environment names, defaults, bounds and normalization | Yes |
| `runtime/logs/hub.jsonl` | Structured runtime evidence, not configuration | No |

First-time setup:

```bash
cp config/settings.example.json data/settings.json
chmod 600 data/settings.json
npm run ncc -- setup
```

Do not copy the example over an existing settings file.

## Persistent settings

Minimal configuration:

```json
{
  "version": 1,
  "qq": {
    "allowedGroups": ["QQ-group-id"],
    "ownerUserIds": ["owner-QQ-id"],
    "bannedUserIds": [],
    "bannedUntilByUserId": {},
    "enhancer": { "enabled": true },
    "proactive": {
      "enabled": true,
      "judgeEveryMessages": 20,
      "judge": { "enabled": true }
    },
    "commandPermissions": {
      "publicCommands": {
        "menu": true,
        "newDialog": true,
        "stop": true,
        "summary": true
      },
      "userCommands": {}
    }
  },
  "ai": {
    "model": "gpt-5.4-mini",
    "reasoningEffort": "low"
  },
  "branding": {
    "assistantName": "assistant",
    "ownerLabel": "owner",
    "assistantMentions": ["@assistant"]
  }
}
```

| Path | Meaning |
| --- | --- |
| `qq.allowedGroups` | QQ group allowlist, stored as string IDs |
| `qq.ownerUserIds` | QQ IDs with absolute owner authority |
| `qq.bannedUserIds` / `bannedUntilByUserId` | Permanent and temporary bans |
| `qq.enhancer.enabled` | QQ media, style and interest enhancements |
| `qq.proactive.*` | Ordinary message/minute interest triggers and judge policy |
| `qq.commandPermissions` | Public and user-specific non-owner command access |
| `imessage.*` | Trusted handles and reply target |
| `ai.*` | QQ and iMessage models and reasoning efforts |
| `remoteExecution.*` | Confirmation-gated execution model, effort and skill |
| `unifiedMemory.*` | Automatic writes and manual handoff behavior |
| `branding.*` | Assistant name, owner label and mention aliases |
| `network.allowLanAccess` | Persistent dashboard LAN switch |

Switch models only to entries currently advertised by the active Codex login.

## Core environment

### Hub and security

| Variable | Default | Purpose |
| --- | --- | --- |
| `CODEX_REMOTE_CONTACT_HOST` | loopback | Explicit bind address |
| `CODEX_REMOTE_CONTACT_PORT` | `3789` | Valid Hub port |
| `CODEX_REMOTE_CONTACT_ALLOW_REMOTE` | `0` | Must be `1` for an explicit non-loopback bind |
| `CODEX_REMOTE_CONTACT_CORS_ORIGINS` | local origins | Allowed Origin list |
| `CODEX_REMOTE_CONTACT_API_TOKEN` | empty | Non-loopback management API token |

A non-loopback listener requires explicit remote allowance and a token. Wildcard CORS without a token is rejected.

### Codex

| Variable | Default | Purpose |
| --- | --- | --- |
| `CODEX_CLI_PATH` | path inside the macOS app | Codex executable; set it or expose `codex` on other platforms |
| `CODEX_REMOTE_CONTACT_CODEX_MODEL` | `gpt-5.4-mini` | QQ startup model |
| `CODEX_REMOTE_CONTACT_REASONING_EFFORT` | `low` | QQ startup reasoning effort |
| `CODEX_REMOTE_CONTACT_CODEX_MAX_CONCURRENCY` | `2` | Active jobs, bounded 1–8 |
| `CODEX_REMOTE_CONTACT_CODEX_MAX_PENDING` | `32` | Pending jobs, bounded 0–256 |
| `CODEX_REMOTE_CONTACT_QUOTA_CACHE_TTL_MS` | `30000` | Quota cache lifetime |

### OneBot

| Variable | Default | Purpose |
| --- | --- | --- |
| `ONEBOT_API_BASE` | `http://127.0.0.1:3000` | OneBot HTTP API |
| `ONEBOT_ACCESS_TOKEN` | empty | Preferred OneBot token |
| `CODEX_REMOTE_CONTACT_ONEBOT_TOKEN` | empty | Compatible token name |
| `CODEX_REMOTE_CONTACT_ONEBOT_TIMEOUT_MS` | `10000` | API timeout, bounded 1–30 seconds |
| `CODEX_REMOTE_CONTACT_ONEBOT_MAX_CONCURRENCY` | `8` | Active webhooks, bounded 1–32 |
| `CODEX_REMOTE_CONTACT_ONEBOT_MAX_PENDING` | `32` | Pending webhooks, bounded 0–256 |

Use the same token on both sides. Without one, the webhook trusts only requests whose Host and actual peer address are both loopback.

### QQ behavior, interest and media

| Variable | Default | Purpose |
| --- | --- | --- |
| `CODEX_REMOTE_CONTACT_QQ_ENHANCER` | `1` | Set `0` to disable the startup enhancement default |
| `CODEX_REMOTE_CONTACT_QQ_MEMORY_LIMIT` | `10` | Lightweight context limit |
| `CODEX_REMOTE_CONTACT_QQ_GROUP_MEMORY_LIMIT` | `200` | Rolling group transcript limit |
| `CODEX_REMOTE_CONTACT_QQ_PROACTIVE` | `1` | Proactive-interest startup default |
| `CODEX_REMOTE_CONTACT_QQ_PROACTIVE_JUDGE` | `1` | Semantic judge switch |
| `..._JUDGE_EVERY_MESSAGES` | `20` | Ordinary unmentioned message threshold, 1–1000 |
| `..._JUDGE_EVERY_MINUTES` | `5` | Minute threshold for a non-empty cycle; `0` disables this branch |
| `..._JUDGE_MODEL` | Hermes 3 405B free | OpenRouter judge model |
| `..._JUDGE_TIMEOUT_MS` | `6500` | Streaming idle timeout |
| `CODEX_REMOTE_CONTACT_QQ_IMAGE_MAX_BYTES` | `20971520` | QQ image limit, 20 MiB by default |
| `CODEX_REMOTE_CONTACT_QQ_BUBBLE_SEPARATOR` | `|||` | Multi-bubble separator |
| `..._BUBBLE_SEND_DELAY_MS` | `650` | Base inter-bubble delay |
| `..._BUBBLE_MAX_COUNT` | `6` | Maximum bubbles per reply |

Self-persona thresholds use `CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_*`; account sticker settings use `CODEX_REMOTE_CONTACT_QQ_ACCOUNT_STICKER_*`. Consult `src/config/environment.js` for every exact name, default and bound.

### Web lookup and judge provider

| Variable | Default | Purpose |
| --- | --- | --- |
| `CODEX_REMOTE_CONTACT_QQ_WEB_LOOKUP` | `1` | QQ web lookup |
| `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER` | `auto` | Preferred provider |
| `CODEX_REMOTE_CONTACT_QQ_WEB_PRESET` | `balanced` | Provider preset |
| `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS` | empty | Explicit provider order |
| `CODEX_REMOTE_CONTACT_QQ_WEB_TIMEOUT_MS` | `12000` | Overall lookup timeout |
| `CODEX_REMOTE_CONTACT_QQ_WEB_ATTEMPT_TIMEOUT_MS` | derived | Per-provider timeout |
| `TAVILY_API_KEY` | empty | Tavily credential |
| `OPENROUTER_API_KEY` | empty | Proactive judge credential |
| `OPENROUTER_BASE_URL` | official endpoint | Optional compatible endpoint |

Run `npm run ncc -- search-config` to initialize the repository environment. Diagnose `/api/maintenance` and the `search` / `interest` logs before editing prompts.

### iMessage, remote execution and logs

- iMessage uses `CODEX_REMOTE_CONTACT_IMESSAGE_*` model, effort, memory, attachment and delivery variables.
- Remote execution uses `CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_*` model, effort, skill, memory and idle-TTL variables and remains confirmation-gated.
- Logging uses `CODEX_REMOTE_CONTACT_LOG_LEVEL` (`debug` by default), `LOG_CONSOLE`, `LOG_CONSOLE_LEVELS`, `LOG_MAX_BYTES` and `LOG_MAX_FILES` with the same prefix.
- SQLite operations are bounded by `CODEX_REMOTE_CONTACT_SQLITE_TIMEOUT_MS` and `CODEX_REMOTE_CONTACT_SQLITE_MAX_OUTPUT_BYTES`.

## Local environment example

```bash
export CODEX_CLI_PATH=/usr/local/bin/codex
export ONEBOT_API_BASE=http://127.0.0.1:3000
export ONEBOT_ACCESS_TOKEN=use-a-real-random-value
export OPENROUTER_API_KEY=use-a-real-secret
export TAVILY_API_KEY=use-a-real-secret
export CODEX_REMOTE_CONTACT_LOG_LEVEL=debug
```

```bash
chmod 600 config/local.env
npm run ncc -- status
```

Never paste real secrets into issues, screenshots, chat transcripts or Git diffs.

## Changing configuration code

1. Parse, default and bound a new variable in `src/config/environment.js`.
2. Pass the normalized value to its consumer; do not add another direct `process.env` read to `server.js`.
3. Extend `test/environment-config.test.js`.
4. Update both languages and the maintenance skill.
5. Run `npm run verify`.
