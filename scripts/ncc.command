#!/usr/bin/env zsh
set -euo pipefail

resolve_script_path() {
  local source="${1:-$0}"
  while [ -L "$source" ]; do
    local dir
    dir="$(cd -P "$(dirname "$source")" && pwd)"
    source="$(readlink "$source")"
    [[ "$source" != /* ]] && source="$dir/$source"
  done
  cd -P "$(dirname "$source")" && pwd
}

SCRIPT_DIR="$(resolve_script_path "$0")"
PROJECT_DIR="${GPT_QQ_BOT_HOME:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export PATH="$HOME/.local/share/codex-qq-bot/node/bin:$HOME/.local/bin:$PATH"
SETTINGS_FILE="$PROJECT_DIR/data/settings.json"
LOCAL_ENV_FILE="$PROJECT_DIR/config/local.env"
DEPLOY_SCRIPT="$PROJECT_DIR/scripts/deploy.command"
SETUP_COMPLETE_KEY="CODEX_REMOTE_CONTACT_NCC_SETUP_COMPLETED"
HUB_URL="${GPT_QQ_BOT_HUB_URL:-http://127.0.0.1:3789}"
LOG_FILE="${CODEX_REMOTE_CONTACT_LOG_FILE:-$PROJECT_DIR/runtime/logs/hub.jsonl}"
ONEBOT_API_BASE_DEFAULT="http://127.0.0.1:3000"
QQ_WEB_SEARCH_PRESET="${CODEX_REMOTE_CONTACT_QQ_WEB_PRESET:-balanced}"
QQ_WEB_SEARCH_PROVIDERS="${CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS:-tavily,bing,baidu,so360,sogou,duckduckgo}"
QQ_WEB_SEARCH_TIMEOUT_MS="${CODEX_REMOTE_CONTACT_QQ_WEB_TIMEOUT_MS:-12000}"
QQ_WEB_SEARCH_ATTEMPT_TIMEOUT_MS="${CODEX_REMOTE_CONTACT_QQ_WEB_ATTEMPT_TIMEOUT_MS:-6500}"

log() {
  printf '[ncc] %s\n' "$*"
}

die() {
  log "错误：$*" >&2
  exit 1
}

pause() {
  printf '\n按回车继续...'
  read -r _ || true
}

ask_yes_no() {
  local prompt="$1"
  local default="${2:-Y}"
  local answer
  printf '%s [%s] ' "$prompt" "$default"
  read -r answer || true
  answer="${answer:-$default}"
  [[ "$answer" != [nN]* ]]
}

need_node() {
  command -v node >/dev/null 2>&1 || die "需要 Node.js。请直接运行 ncc 启动首次部署。"
}

ensure_settings() {
  local created_local_state="0"
  mkdir -p "$PROJECT_DIR/data" "$PROJECT_DIR/config" "$PROJECT_DIR/runtime/logs" "$PROJECT_DIR/runtime/replies"
  if [ ! -f "$SETTINGS_FILE" ]; then
    cp "$PROJECT_DIR/config/settings.example.json" "$SETTINGS_FILE"
    log "已创建 $SETTINGS_FILE"
    created_local_state="1"
  fi
  if [ ! -f "$LOCAL_ENV_FILE" ]; then
    touch "$LOCAL_ENV_FILE"
    created_local_state="1"
  fi
  if [ "$created_local_state" = "1" ] && [ -z "$(env_file_value "$LOCAL_ENV_FILE" "$SETUP_COMPLETE_KEY")" ]; then
    mark_setup_state "0"
  fi
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

env_file_value() {
  local file="$1"
  local key="$2"
  [ -f "$file" ] || return 0
  sed -n "s/^export ${key}=//p; s/^${key}=//p" "$file" | tail -n 1 | sed "s/^'//; s/'$//"
}

mark_setup_state() {
  set_env_value "$SETUP_COMPLETE_KEY" "$1"
}

setup_is_complete() {
  local state
  state="$(env_file_value "$LOCAL_ENV_FILE" "$SETUP_COMPLETE_KEY")"
  if [ "$state" = "1" ]; then
    return 0
  fi
  if [ "$state" = "0" ]; then
    return 1
  fi

  # Existing installations from before v1.1.7 already have both local files.
  # Adopt them without forcing a new first-run wizard, then persist the decision.
  if [ -f "$SETTINGS_FILE" ] && [ -f "$LOCAL_ENV_FILE" ] && command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    local major
    major="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf '0')"
    if [ "$major" -ge 20 ]; then
      mark_setup_state "1"
      log "已识别并接管现有部署，后续直接进入 ncc 常规菜单。"
      return 0
    fi
  fi
  return 1
}

mask_secret() {
  local value="$1"
  if [ -z "$value" ]; then
    printf '<未设置>'
  elif [ "${#value}" -le 8 ]; then
    printf '****'
  else
    printf '****%s' "${value[-4,-1]}"
  fi
}

search_config() {
  ensure_settings
  local tavily_key provider
  tavily_key="${TAVILY_API_KEY:-${CODEX_REMOTE_CONTACT_TAVILY_API_KEY:-}}"
  [ -n "$tavily_key" ] || tavily_key="$(env_file_value "$LOCAL_ENV_FILE" TAVILY_API_KEY)"
  [ -n "$tavily_key" ] || tavily_key="$(env_file_value "$LOCAL_ENV_FILE" CODEX_REMOTE_CONTACT_TAVILY_API_KEY)"

  provider="auto"
  [ -n "$tavily_key" ] && provider="tavily"

  set_env_value "CODEX_REMOTE_CONTACT_QQ_WEB_LOOKUP" "1"
  set_env_value "CODEX_REMOTE_CONTACT_QQ_WEB_PRESET" "$QQ_WEB_SEARCH_PRESET"
  set_env_value "CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS" "$QQ_WEB_SEARCH_PROVIDERS"
  set_env_value "CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER" "$provider"
  set_env_value "CODEX_REMOTE_CONTACT_QQ_WEB_TIMEOUT_MS" "$QQ_WEB_SEARCH_TIMEOUT_MS"
  set_env_value "CODEX_REMOTE_CONTACT_QQ_WEB_LOOKUP_TIMEOUT_MS" "$QQ_WEB_SEARCH_TIMEOUT_MS"
  set_env_value "CODEX_REMOTE_CONTACT_QQ_WEB_ATTEMPT_TIMEOUT_MS" "$QQ_WEB_SEARCH_ATTEMPT_TIMEOUT_MS"
  if [ -n "$tavily_key" ]; then
    set_env_value "TAVILY_API_KEY" "$tavily_key"
  fi

  log "联网搜索配置已保存到 $LOCAL_ENV_FILE"
  log "搜索预设：$QQ_WEB_SEARCH_PRESET"
  log "厂商顺序：$QQ_WEB_SEARCH_PROVIDERS"
  log "优先厂商：$provider"
  log "Tavily key：$(mask_secret "$tavily_key")"
}

show_status() {
  ensure_settings
  printf '\nCodex QQ Bot 状态\n'
  printf '项目目录：%s\n' "$PROJECT_DIR"
  printf '配置文件：%s\n' "$SETTINGS_FILE"
  printf '本地环境：%s\n' "$LOCAL_ENV_FILE"
  printf 'Node: %s\n' "$(command -v node >/dev/null 2>&1 && node --version || echo missing)"
  printf 'npm: %s\n' "$(command -v npm >/dev/null 2>&1 && npm --version || echo missing)"
  printf 'Codex: %s\n' "$(command -v codex >/dev/null 2>&1 && command -v codex || echo missing)"
  printf 'OneBot: '
  local onebot_base
  onebot_base="$(grep '^export ONEBOT_API_BASE=' "$LOCAL_ENV_FILE" 2>/dev/null | tail -n 1 | sed 's/^export ONEBOT_API_BASE=//; s/^'\''//; s/'\''$//' || true)"
  [ -n "$onebot_base" ] || onebot_base="$ONEBOT_API_BASE_DEFAULT"
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "${onebot_base%/}/get_login_info" >/dev/null 2>&1; then
    printf '可连接（%s）\n' "$onebot_base"
  else
    printf '不可连接（%s）\n' "$onebot_base"
  fi
  printf 'Hub: '
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "${HUB_URL%/}/api/state" >/dev/null 2>&1; then
    printf '可连接（%s）\n' "$HUB_URL"
  else
    printf '不可连接（%s）\n' "$HUB_URL"
  fi
}

codex_menu() {
  local should_pause="${1:-1}"
  printf '\nCodex 登录与检测\n'
  if ! command -v codex >/dev/null 2>&1; then
    log "没有找到 Codex CLI，或它不在 PATH 里。"
    log "请先运行根目录的 一键部署.command 尝试安装，或手动安装 Codex CLI。"
    [ "$should_pause" = "1" ] && pause
    return
  fi
  codex --version || true
  printf '\n现在打开 Codex 登录吗？[Y/n] '
  read -r answer || true
  if [[ "${answer:-Y}" != [nN]* ]]; then
    codex login
  fi
  printf '\n现在做一次 Codex 鉴权测试吗？[Y/n] '
  read -r test_answer || true
  if [[ "${test_answer:-Y}" != [nN]* ]]; then
    codex exec --ephemeral --skip-git-repo-check -C "$PROJECT_DIR" "Only output OK"
  fi
  [ "$should_pause" = "1" ] && pause
}

qq_menu() {
  local should_pause="${1:-1}"
  ensure_settings
  printf '\nQQ / OneBot 配置\n'
  printf 'OneBot API 地址 [%s]: ' "$ONEBOT_API_BASE_DEFAULT"
  read -r onebot_base || true
  onebot_base="${onebot_base:-$ONEBOT_API_BASE_DEFAULT}"
  set_env_value "ONEBOT_API_BASE" "$onebot_base"
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "${onebot_base%/}/get_login_info" >/tmp/gpt-qq-bot-onebot.json 2>/dev/null; then
    log "OneBot 可以连接："
    cat /tmp/gpt-qq-bot-onebot.json
    rm -f /tmp/gpt-qq-bot-onebot.json
  else
    log "暂时连不上 OneBot。请先启动 NapCat/LLBot 并登录 QQ，然后再运行 ncc。"
  fi
  printf '\n主人 QQ 号，多个用空格或逗号分隔：'
  read -r owners || true
  if [ -n "${owners:-}" ]; then
    local owners_json
    owners_json="$(csv_to_json_array_js "$owners")"
    json_update "data.qq = data.qq || {}; data.qq.ownerUserIds = ${owners_json};"
  fi
  printf 'QQ群白名单，多个用空格或逗号分隔：'
  read -r groups || true
  if [ -n "${groups:-}" ]; then
    local groups_json
    groups_json="$(csv_to_json_array_js "$groups")"
    json_update "data.qq = data.qq || {}; data.qq.allowedGroups = ${groups_json};"
  fi
  log "QQ 设置已保存。"
  [ "$should_pause" = "1" ] && pause
}

owner_menu() {
  ensure_settings
  printf '\n设置主人 QQ 号，多个用空格或逗号分隔：'
  read -r owners || true
  [ -n "${owners:-}" ] || return
  local owners_json
  owners_json="$(csv_to_json_array_js "$owners")"
  json_update "data.qq = data.qq || {}; data.qq.ownerUserIds = ${owners_json};"
  log "主人 QQ 号已保存。"
  pause
}

groups_menu() {
  ensure_settings
  printf '\n设置 QQ 群白名单，多个用空格或逗号分隔：'
  read -r groups || true
  [ -n "${groups:-}" ] || return
  local groups_json
  groups_json="$(csv_to_json_array_js "$groups")"
  json_update "data.qq = data.qq || {}; data.qq.allowedGroups = ${groups_json};"
  log "QQ群白名单已保存。"
  pause
}

normalize_session_mode() {
  case "${1:-}" in
    auto|automatic|自动) printf 'auto\n' ;;
    persistent|long|长期) printf 'persistent\n' ;;
    temporary|temp|ephemeral|临时|一次性) printf 'temporary\n' ;;
    inherit|default|继承|默认) printf 'inherit\n' ;;
    *) return 1 ;;
  esac
}

show_session_modes() {
  ensure_settings
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "${HUB_URL%/}/api/state" >/tmp/codex-qq-session-state.json 2>/dev/null; then
    node - /tmp/codex-qq-session-state.json <<'NODE'
const fs = require("fs");
const state = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const session = state.qq?.codexSession || {};
console.log(`默认模式：${session.defaultMode || "auto"}`);
console.log(`长期线程：${session.activeThreads || 0}`);
const scopes = Object.entries(session.scopes || {});
console.log(scopes.length ? "范围覆盖：" : "范围覆盖：<无>");
for (const [scopeId, mode] of scopes) console.log(`  ${scopeId}: ${mode}`);
NODE
    rm -f /tmp/codex-qq-session-state.json
    return
  fi
  node - "$SETTINGS_FILE" <<'NODE'
const fs = require("fs");
const settings = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const session = settings.qq?.codexSession || {};
console.log(`默认模式：${session.defaultMode || "auto"}`);
const scopes = Object.entries(session.scopes || {});
console.log(scopes.length ? "范围覆盖：" : "范围覆盖：<无>");
for (const [scopeId, mode] of scopes) console.log(`  ${scopeId}: ${mode}`);
NODE
}

set_session_mode() {
  ensure_settings
  local mode scope_id payload
  mode="$(normalize_session_mode "${1:-}")" || die "会话模式只能是 auto、persistent、temporary 或 inherit。"
  scope_id="${2:-}"
  if [ "$mode" = "inherit" ] && [ -z "$scope_id" ]; then
    die "inherit 必须指定群号或 private:QQ号。"
  fi
  if [ -n "$scope_id" ] && [[ ! "$scope_id" =~ ^[1-9][0-9]{4,12}$ && ! "$scope_id" =~ ^private:[1-9][0-9]{4,12}$ ]]; then
    die "范围必须是 QQ 群号或 private:QQ号。"
  fi
  payload="$(MODE="$mode" SCOPE_ID="$scope_id" node - <<'NODE'
const mode = process.env.MODE;
const scopeId = process.env.SCOPE_ID;
process.stdout.write(JSON.stringify(scopeId ? { mode, scopeId } : { mode }));
NODE
)"
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "${HUB_URL%/}/api/state" >/dev/null 2>&1; then
    curl -fsS --max-time 8 -X POST "${HUB_URL%/}/api/qq/session-mode" \
      -H 'content-type: application/json' \
      -d "$payload" >/dev/null
  else
    MODE="$mode" SCOPE_ID="$scope_id" node - "$SETTINGS_FILE" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const mode = process.env.MODE;
const scopeId = process.env.SCOPE_ID;
data.qq ||= {};
data.qq.codexSession ||= { defaultMode: "auto", scopes: {} };
data.qq.codexSession.scopes ||= {};
if (!scopeId) data.qq.codexSession.defaultMode = mode;
else if (mode === "inherit") delete data.qq.codexSession.scopes[scopeId];
else data.qq.codexSession.scopes[scopeId] = mode;
data.updatedAt = new Date().toISOString();
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
NODE
  fi
  log "会话模式已保存：${scope_id:-默认} -> $mode"
  show_session_modes
}

session_menu() {
  show_session_modes
  printf '\n模式 auto/persistent/temporary（直接回车只查看）：'
  read -r mode || true
  [ -n "${mode:-}" ] || {
    pause
    return
  }
  printf '群号或 private:QQ号（留空修改默认模式）：'
  read -r scope_id || true
  set_session_mode "$mode" "${scope_id:-}"
  pause
}

branding_menu() {
  local should_pause="${1:-1}"
  ensure_settings
  printf '\n助手显示名 [assistant]: '
  read -r assistant_name || true
  assistant_name="${assistant_name:-assistant}"
  printf '主人称呼 [owner]: '
  read -r owner_label || true
  owner_label="${owner_label:-owner}"
  printf '触发 @ 别名，多个用空格或逗号分隔 [@assistant]: '
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
  log "助手名称设置已保存。"
  [ "$should_pause" = "1" ] && pause
}

start_hub() {
  ensure_settings
  search_config
  "$PROJECT_DIR/modules/install-launchd-plist.command"
  if [[ "$(uname -s)" == "Darwin" ]] && command -v launchctl >/dev/null 2>&1; then
    "$PROJECT_DIR/modules/start-all.command"
  else
    log "当前系统没有 launchctl，将用 npm start 前台启动。"
    log "按 Ctrl+C 停止。"
    cd "$PROJECT_DIR"
    set -a
    [ -f "$LOCAL_ENV_FILE" ] && source "$LOCAL_ENV_FILE"
    set +a
    npm start
  fi
}

open_hub_api() {
  local url="$HUB_URL/api/state"
  if command -v open >/dev/null 2>&1; then
    open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url"
  else
    log "Hub API 状态地址：$url"
  fi
}

print_logs() {
  if [ ! -f "$LOG_FILE" ]; then
    log "暂无日志文件：$LOG_FILE"
    return 0
  fi
  node "$PROJECT_DIR/scripts/ncc-log-viewer.mjs" "$LOG_FILE" "$@"
}

first_run_wizard() {
  clear 2>/dev/null || true
  cat <<'WELCOME'
Codex QQ Bot 首次部署（ncc）

这是当前安装第一次运行 ncc。接下来会：
1) 检测系统并自动补齐下载、解压、Git、zsh、Node.js 20+、npm 和 Codex CLI
2) 在受支持的 Linux 上自动安装 NapCat、LinuxQQ、OneBot 运行库
3) 安装 npm 依赖并运行 npm run verify
4) 填写 OneBot、主人 QQ、群白名单、助手名称和联网配置

已有的 data/settings.json、config/local.env 和全局 ncc 不会被整份覆盖。
WELCOME
  if ! ask_yes_no "现在开始首次部署吗？" "Y"; then
    log "已取消。下次运行 ncc 会继续询问。"
    return 1
  fi

  mark_setup_state "0"
  if [ "${NCC_ENVIRONMENT_PREPARED:-0}" != "1" ]; then
    [ -f "$DEPLOY_SCRIPT" ] || die "找不到首次部署脚本：$DEPLOY_SCRIPT"
    zsh "$DEPLOY_SCRIPT" --prepare-only
  fi

  ensure_settings
  if command -v codex >/dev/null 2>&1 && ask_yes_no "现在进行 Codex 登录和鉴权测试吗？" "Y"; then
    codex_menu "0"
  fi

  qq_menu "0"
  branding_menu "0"
  search_config
  mark_setup_state "1"

  cat <<EOF

首次部署已完成。

配置文件：$SETTINGS_FILE
本地环境：$LOCAL_ENV_FILE
以后运行 ncc 会直接进入日常功能菜单。
EOF
  if ask_yes_no "现在启动 Hub 吗？" "Y"; then
    start_hub
  fi
}

run_default_menu() {
  if setup_is_complete; then
    setup_wizard
  else
    first_run_wizard
  fi
}

setup_wizard() {
  ensure_settings
  while true; do
    clear 2>/dev/null || true
    cat <<'MENU'
Codex QQ Bot 控制中心（ncc）

1) Codex 登录 / 鉴权测试
2) QQ / OneBot 配置
3) 设置主人 QQ 号
4) 设置 QQ 群白名单
5) QQ 会话模式（自动/长期/临时）
6) 设置助手名称和 @ 别名
7) 初始化/刷新联网搜索配置
8) 启动 Hub
9) 状态检查
10) 打开 Hub API 状态
11) 查看日志
0) 退出
MENU
    printf '\n请选择：'
    read -r choice || true
    case "${choice:-}" in
      1) codex_menu ;;
      2) qq_menu ;;
      3) owner_menu ;;
      4) groups_menu ;;
      5) session_menu ;;
      6) branding_menu ;;
      7) search_config; pause ;;
      8) start_hub; pause ;;
      9) show_status; pause ;;
      10) open_hub_api; pause ;;
      11) print_logs; pause ;;
      0|q|quit|exit) break ;;
      *) log "未知选项。"; pause ;;
    esac
  done
}

case "${1:-menu}" in
  setup|menu) run_default_menu ;;
  first-run|deploy) first_run_wizard ;;
  status|doctor) show_status ;;
  codex-login|codex) codex_menu ;;
  qq) qq_menu ;;
  owner) owner_menu ;;
  groups) groups_menu ;;
  session) show_session_modes ;;
  session-mode) set_session_mode "${2:-}" "${3:-}" ;;
  branding) branding_menu ;;
  search-config) search_config ;;
  start) start_hub ;;
  open) open_hub_api ;;
  logs) shift; print_logs "$@" ;;
  help|-h|--help)
    cat <<EOF
用法：ncc [menu|first-run|status|codex-login|qq|owner|groups|session|session-mode MODE [SCOPE]|branding|search-config|start|open|logs]
首次直接运行 ncc：自动检测环境、安装依赖、验证并填写配置；完成后再运行为常规功能菜单。
日志：ncc logs [--tail N] [-f] [--level LEVELS|--errors] [--category NAMES] [--trace ID] [--group ID] [--sender ID] [--search TEXT] [--since 30m|ISO] [--until ISO] [--slow [MS]] [--summary] [--json] [--all] [--verbose|--compact] [--plain|--color]
项目目录：$PROJECT_DIR
EOF
    ;;
  *)
    cat <<EOF
用法：ncc [menu|first-run|status|codex-login|qq|owner|groups|session|session-mode MODE [SCOPE]|branding|search-config|start|open|logs]
日志：ncc logs [--tail N] [-f] [--level LEVELS|--errors] [--category NAMES] [--trace ID] [--group ID] [--sender ID] [--search TEXT] [--since 30m|ISO] [--until ISO] [--slow [MS]] [--summary] [--json] [--all] [--verbose|--compact] [--plain|--color]
项目目录：$PROJECT_DIR
EOF
    ;;
esac
