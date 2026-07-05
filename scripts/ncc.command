#!/usr/bin/env zsh
set -euo pipefail

resolve_script_path() {
  local source="$0"
  while [ -L "$source" ]; do
    local dir
    dir="$(cd -P "$(dirname "$source")" && pwd)"
    source="$(readlink "$source")"
    [[ "$source" != /* ]] && source="$dir/$source"
  done
  cd -P "$(dirname "$source")" && pwd
}

SCRIPT_DIR="$(resolve_script_path)"
PROJECT_DIR="${GPT_QQ_BOT_HOME:-$(cd "$SCRIPT_DIR/.." && pwd)}"
SETTINGS_FILE="$PROJECT_DIR/data/settings.json"
LOCAL_ENV_FILE="$PROJECT_DIR/config/local.env"
HUB_URL="${GPT_QQ_BOT_HUB_URL:-http://127.0.0.1:3789}"
ONEBOT_API_BASE_DEFAULT="http://127.0.0.1:3000"

log() {
  printf '[ncc] %s\n' "$*"
}

die() {
  log "Error: $*" >&2
  exit 1
}

pause() {
  printf '\nPress Enter to continue...'
  read -r _ || true
}

need_node() {
  command -v node >/dev/null 2>&1 || die "Node.js is required. Run scripts/deploy.command first."
}

ensure_settings() {
  mkdir -p "$PROJECT_DIR/data" "$PROJECT_DIR/config" "$PROJECT_DIR/runtime/logs" "$PROJECT_DIR/runtime/replies"
  if [ ! -f "$SETTINGS_FILE" ]; then
    cp "$PROJECT_DIR/config/settings.example.json" "$SETTINGS_FILE"
    log "Created $SETTINGS_FILE"
  fi
  touch "$LOCAL_ENV_FILE"
}

json_update() {
  need_node
  local script="$1"
  node - "$SETTINGS_FILE" "$script" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const script = process.argv[3];
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const fn = new Function("data", script);
fn(data);
data.updatedAt = new Date().toISOString();
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
NODE
}

csv_to_json_array_js() {
  local raw="$1"
  RAW_VALUE="$raw" node - <<'NODE'
const raw = process.env.RAW_VALUE || "";
const values = [...new Set(raw.split(/[,\s，、]+/).map((item) => item.trim()).filter(Boolean))];
process.stdout.write(JSON.stringify(values));
NODE
}

set_env_value() {
  local key="$1"
  local value="$2"
  mkdir -p "$(dirname "$LOCAL_ENV_FILE")"
  touch "$LOCAL_ENV_FILE"
  local tmp="$LOCAL_ENV_FILE.tmp.$$"
  grep -v "^export ${key}=" "$LOCAL_ENV_FILE" > "$tmp" 2>/dev/null || true
  printf "export %s=%q\n" "$key" "$value" >> "$tmp"
  mv "$tmp" "$LOCAL_ENV_FILE"
  chmod 600 "$LOCAL_ENV_FILE"
}

show_status() {
  ensure_settings
  printf '\nGPT QQ Bot status\n'
  printf 'Project: %s\n' "$PROJECT_DIR"
  printf 'Settings: %s\n' "$SETTINGS_FILE"
  printf 'Local env: %s\n' "$LOCAL_ENV_FILE"
  printf 'Node: %s\n' "$(command -v node >/dev/null 2>&1 && node --version || echo missing)"
  printf 'npm: %s\n' "$(command -v npm >/dev/null 2>&1 && npm --version || echo missing)"
  printf 'Codex: %s\n' "$(command -v codex >/dev/null 2>&1 && command -v codex || echo missing)"
  printf 'OneBot: '
  local onebot_base
  onebot_base="$(grep '^export ONEBOT_API_BASE=' "$LOCAL_ENV_FILE" 2>/dev/null | tail -n 1 | sed 's/^export ONEBOT_API_BASE=//; s/^'\''//; s/'\''$//' || true)"
  [ -n "$onebot_base" ] || onebot_base="$ONEBOT_API_BASE_DEFAULT"
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "${onebot_base%/}/get_login_info" >/dev/null 2>&1; then
    printf 'online (%s)\n' "$onebot_base"
  else
    printf 'not reachable (%s)\n' "$onebot_base"
  fi
  printf 'Hub: '
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "${HUB_URL%/}/api/state" >/dev/null 2>&1; then
    printf 'online (%s)\n' "$HUB_URL"
  else
    printf 'not reachable (%s)\n' "$HUB_URL"
  fi
}

codex_menu() {
  printf '\nCodex setup\n'
  if ! command -v codex >/dev/null 2>&1; then
    log "Codex CLI is not installed or not on PATH."
    log "Run scripts/deploy.command to try installing it, or install Codex CLI manually."
    pause
    return
  fi
  codex --version || true
  printf '\nRun Codex login now? [Y/n] '
  read -r answer || true
  if [[ "${answer:-Y}" != [nN]* ]]; then
    codex login
  fi
  printf '\nQuick auth test? [Y/n] '
  read -r test_answer || true
  if [[ "${test_answer:-Y}" != [nN]* ]]; then
    codex exec --ephemeral --skip-git-repo-check -C "$PROJECT_DIR" "Only output OK"
  fi
  pause
}

qq_menu() {
  ensure_settings
  printf '\nQQ / OneBot setup\n'
  printf 'OneBot API base [%s]: ' "$ONEBOT_API_BASE_DEFAULT"
  read -r onebot_base || true
  onebot_base="${onebot_base:-$ONEBOT_API_BASE_DEFAULT}"
  set_env_value "ONEBOT_API_BASE" "$onebot_base"
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "${onebot_base%/}/get_login_info" >/tmp/gpt-qq-bot-onebot.json 2>/dev/null; then
    log "OneBot is reachable:"
    cat /tmp/gpt-qq-bot-onebot.json
    rm -f /tmp/gpt-qq-bot-onebot.json
  else
    log "OneBot is not reachable yet. Start NapCat/LLBot and log into QQ, then run ncc again."
  fi
  printf '\nQQ owner user id(s), separated by comma/space: '
  read -r owners || true
  if [ -n "${owners:-}" ]; then
    local owners_json
    owners_json="$(csv_to_json_array_js "$owners")"
    json_update "data.qq = data.qq || {}; data.qq.ownerUserIds = ${owners_json};"
  fi
  printf 'Allowed QQ group id(s), separated by comma/space: '
  read -r groups || true
  if [ -n "${groups:-}" ]; then
    local groups_json
    groups_json="$(csv_to_json_array_js "$groups")"
    json_update "data.qq = data.qq || {}; data.qq.allowedGroups = ${groups_json};"
  fi
  log "QQ settings saved."
  pause
}

owner_menu() {
  ensure_settings
  printf '\nSet owner QQ id(s), separated by comma/space: '
  read -r owners || true
  [ -n "${owners:-}" ] || return
  local owners_json
  owners_json="$(csv_to_json_array_js "$owners")"
  json_update "data.qq = data.qq || {}; data.qq.ownerUserIds = ${owners_json};"
  log "Owner QQ id(s) saved."
  pause
}

groups_menu() {
  ensure_settings
  printf '\nSet allowed QQ group id(s), separated by comma/space: '
  read -r groups || true
  [ -n "${groups:-}" ] || return
  local groups_json
  groups_json="$(csv_to_json_array_js "$groups")"
  json_update "data.qq = data.qq || {}; data.qq.allowedGroups = ${groups_json};"
  log "QQ group allowlist saved."
  pause
}

branding_menu() {
  ensure_settings
  printf '\nAssistant display name [assistant]: '
  read -r assistant_name || true
  assistant_name="${assistant_name:-assistant}"
  printf 'Owner label [owner]: '
  read -r owner_label || true
  owner_label="${owner_label:-owner}"
  printf 'Mention aliases, separated by comma/space [@assistant]: '
  read -r mentions || true
  mentions="${mentions:-@assistant}"
  local mentions_json
  mentions_json="$(csv_to_json_array_js "$mentions")"
  ASSISTANT_NAME="$assistant_name" OWNER_LABEL="$owner_label" MENTIONS_JSON="$mentions_json" node - "$SETTINGS_FILE" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, "utf8"));
data.branding = data.branding || {};
data.branding.assistantName = process.env.ASSISTANT_NAME || "assistant";
data.branding.ownerLabel = process.env.OWNER_LABEL || "owner";
data.branding.assistantMentions = JSON.parse(process.env.MENTIONS_JSON || '["@assistant"]');
data.updatedAt = new Date().toISOString();
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
NODE
  log "Branding saved."
  pause
}

start_hub() {
  ensure_settings
  "$PROJECT_DIR/modules/install-launchd-plist.command"
  if [[ "$(uname -s)" == "Darwin" ]] && command -v launchctl >/dev/null 2>&1; then
    "$PROJECT_DIR/modules/start-all.command"
  else
    log "launchctl is not available. Starting foreground server with npm start."
    log "Press Ctrl+C to stop."
    cd "$PROJECT_DIR"
    set -a
    [ -f "$LOCAL_ENV_FILE" ] && source "$LOCAL_ENV_FILE"
    set +a
    npm start
  fi
}

open_webui() {
  if command -v open >/dev/null 2>&1; then
    open "$HUB_URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$HUB_URL"
  else
    log "Open this URL: $HUB_URL"
  fi
}

setup_wizard() {
  ensure_settings
  while true; do
    clear 2>/dev/null || true
    cat <<'MENU'
GPT QQ Bot quick config (ncc)

1) Codex login / auth test
2) QQ / OneBot setup
3) Set owner QQ id
4) Set allowed QQ groups
5) Assistant name and mentions
6) Start Hub
7) Status check
8) Open WebUI
0) Exit
MENU
    printf '\nChoose: '
    read -r choice || true
    case "${choice:-}" in
      1) codex_menu ;;
      2) qq_menu ;;
      3) owner_menu ;;
      4) groups_menu ;;
      5) branding_menu ;;
      6) start_hub; pause ;;
      7) show_status; pause ;;
      8) open_webui; pause ;;
      0|q|quit|exit) break ;;
      *) log "Unknown choice."; pause ;;
    esac
  done
}

case "${1:-setup}" in
  setup|menu) setup_wizard ;;
  status|doctor) show_status ;;
  codex-login|codex) codex_menu ;;
  qq) qq_menu ;;
  owner) owner_menu ;;
  groups) groups_menu ;;
  branding) branding_menu ;;
  start) start_hub ;;
  open) open_webui ;;
  *)
    cat <<EOF
Usage: ncc [setup|status|codex-login|qq|owner|groups|branding|start|open]
Project: $PROJECT_DIR
EOF
    ;;
esac
