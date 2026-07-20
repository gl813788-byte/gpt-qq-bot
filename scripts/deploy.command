#!/usr/bin/env zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NCC_SOURCE="$PROJECT_DIR/scripts/ncc.command"
BOOTSTRAP_SCRIPT="$PROJECT_DIR/scripts/bootstrap-environment.sh"
LOCAL_BIN="$HOME/.local/bin"
NCC_TARGET_USER="$LOCAL_BIN/ncc"
NCC_TARGET_SYSTEM="/usr/local/bin/ncc"
SETTINGS_FILE="$PROJECT_DIR/data/settings.json"
LOCAL_ENV_FILE="$PROJECT_DIR/config/local.env"
SETUP_COMPLETE_KEY="CODEX_REMOTE_CONTACT_NCC_SETUP_COMPLETED"

log() {
  printf '[deploy] %s\n' "$*"
}

warn() {
  printf '[deploy] 警告：%s\n' "$*" >&2
}

die() {
  printf '[deploy] 错误：%s\n' "$*" >&2
  exit 1
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

run_if_missing() {
  local cmd="$1"
  shift
  if command -v "$cmd" >/dev/null 2>&1; then
    return 0
  fi
  "$@"
}

detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux) echo "linux" ;;
    *) echo "unknown" ;;
  esac
}

install_with_brew() {
  local package="$1"
  command -v brew >/dev/null 2>&1 || return 1
  brew list "$package" >/dev/null 2>&1 || brew install "$package"
}

install_with_apt() {
  local package="$1"
  command -v apt >/dev/null 2>&1 || return 1
  if command -v sudo >/dev/null 2>&1; then
    sudo apt update
    sudo apt install -y "$package"
  else
    apt update
    apt install -y "$package"
  fi
}

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -p 'Number(process.versions.node.split(".")[0])')"
    if [ "$major" -ge 20 ]; then
      log "已找到 Node.js $(node --version)。"
      return
    fi
    warn "当前 Node.js $(node --version) 低于要求的 v20。"
  fi

  if ! ask_yes_no "是否自动安装或升级 Node.js？" "Y"; then
    warn "已跳过 Node.js 安装。Hub 需要 Node.js 20+。"
    return
  fi

  case "$(detect_os)" in
    macos)
      install_with_brew node || warn "没有找到 Homebrew，请手动安装 Node.js 20+。"
      ;;
    linux)
      install_with_apt nodejs || warn "无法通过 apt 安装 nodejs。"
      install_with_apt npm || warn "无法通过 apt 安装 npm。"
      ;;
    *)
      warn "当前系统不支持自动安装 Node.js。"
      ;;
  esac

  if ! command -v node >/dev/null 2>&1; then
    die "Node.js 安装后仍不可用，请安装 Node.js 20+ 后重试。"
  fi
  local installed_major
  installed_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
  [ "$installed_major" -ge 20 ] || die "当前 Node.js $(node --version) 仍低于 v20，请升级后重试。"
}

ensure_basic_tools() {
  for cmd in curl git zsh; do
    if command -v "$cmd" >/dev/null 2>&1; then
      log "已找到 $cmd。"
      continue
    fi
    if ask_yes_no "是否自动安装缺失工具 '$cmd'？" "Y"; then
      case "$(detect_os)" in
        macos) install_with_brew "$cmd" || warn "无法通过 brew 安装 $cmd。" ;;
        linux) install_with_apt "$cmd" || warn "无法通过 apt 安装 $cmd。" ;;
      esac
    fi
  done
}

ensure_codex() {
  if command -v codex >/dev/null 2>&1; then
    log "已找到 Codex CLI：$(command -v codex)"
    return
  fi
  warn "没有找到 Codex CLI。"
  if command -v npm >/dev/null 2>&1 && ask_yes_no "是否尝试用 npm 全局安装 Codex CLI？" "Y"; then
    npm install -g @openai/codex || warn "Codex CLI 安装失败。你仍然可以稍后手动安装再继续配置。"
  else
    warn "启用 AI 回复前需要手动安装 Codex CLI。"
  fi
}

ensure_project_files() {
  mkdir -p "$PROJECT_DIR/data" "$PROJECT_DIR/config" "$PROJECT_DIR/runtime/logs" "$PROJECT_DIR/runtime/replies" "$PROJECT_DIR/workspaces/codex-cli"
  touch "$PROJECT_DIR/runtime/logs/.gitkeep" "$PROJECT_DIR/runtime/replies/.gitkeep"
  if [ ! -f "$PROJECT_DIR/data/settings.json" ]; then
    cp "$PROJECT_DIR/config/settings.example.json" "$PROJECT_DIR/data/settings.json"
    log "已根据示例创建 data/settings.json。"
  fi
  for file in unified-memory.json; do
    if [ ! -f "$PROJECT_DIR/data/$file" ] && [ -f "$PROJECT_DIR/data/$file.example" ]; then
      cp "$PROJECT_DIR/data/$file.example" "$PROJECT_DIR/data/$file"
    fi
  done
  "$PROJECT_DIR/modules/install-launchd-plist.command"
}

write_local_env_defaults() {
  local env_file="$LOCAL_ENV_FILE"
  touch "$env_file"
  if ! grep -q '^export PATH=' "$env_file" 2>/dev/null; then
    printf 'export PATH=%q\n' "$PATH" >> "$env_file"
  fi
  if command -v codex >/dev/null 2>&1 && ! grep -q '^export CODEX_CLI_PATH=' "$env_file" 2>/dev/null; then
    printf 'export CODEX_CLI_PATH=%q\n' "$(command -v codex)" >> "$env_file"
  fi
  if ! grep -q '^export ONEBOT_API_BASE=' "$env_file" 2>/dev/null; then
    printf 'export ONEBOT_API_BASE=%q\n' "http://127.0.0.1:3000" >> "$env_file"
  fi
  chmod 600 "$env_file"
}

mark_fresh_setup_pending() {
  if [ -f "$SETTINGS_FILE" ] && [ -f "$LOCAL_ENV_FILE" ]; then
    return
  fi
  mkdir -p "$(dirname "$LOCAL_ENV_FILE")"
  touch "$LOCAL_ENV_FILE"
  if ! grep -q "^export ${SETUP_COMPLETE_KEY}=" "$LOCAL_ENV_FILE" 2>/dev/null; then
    printf 'export %s=0\n' "$SETUP_COMPLETE_KEY" >> "$LOCAL_ENV_FILE"
  fi
  chmod 600 "$LOCAL_ENV_FILE"
}

ensure_npm_ready() {
  command -v npm >/dev/null 2>&1 || die "未找到 npm，无法安装项目依赖。"
  log "安装 npm 项目依赖。"
  if [ -f "$PROJECT_DIR/package-lock.json" ]; then
    (cd "$PROJECT_DIR" && npm ci --no-audit --no-fund)
  else
    (cd "$PROJECT_DIR" && npm install --no-audit --no-fund --no-package-lock)
  fi
  log "运行完整项目验证。"
  (cd "$PROJECT_DIR" && npm run verify)
}

install_ncc_shortcut() {
  chmod +x "$NCC_SOURCE"
  local existing_ncc
  existing_ncc="$(command -v ncc 2>/dev/null || true)"
  if [ -n "$existing_ncc" ] && [ "$(readlink -f "$existing_ncc" 2>/dev/null || printf '%s' "$existing_ncc")" != "$(readlink -f "$NCC_SOURCE" 2>/dev/null || printf '%s' "$NCC_SOURCE")" ]; then
    warn "检测到已有 ncc：$existing_ncc，为避免覆盖现有 NapCat 控制器，已跳过快捷命令安装。"
    warn "仓库配置助手始终可用：npm run ncc -- setup"
    return
  fi
  if [ -w "$(dirname "$NCC_TARGET_SYSTEM")" ]; then
    ln -sf "$NCC_SOURCE" "$NCC_TARGET_SYSTEM"
    log "已安装 ncc 快捷命令：$NCC_TARGET_SYSTEM"
    return
  fi

  mkdir -p "$LOCAL_BIN"
  ln -sf "$NCC_SOURCE" "$NCC_TARGET_USER"
  log "已安装 ncc 快捷命令：$NCC_TARGET_USER"
  case ":$PATH:" in
    *":$LOCAL_BIN:"*) ;;
    *) warn "$LOCAL_BIN 不在 PATH 中。请把这行加入 shell 配置：export PATH=\"$LOCAL_BIN:\$PATH\"" ;;
  esac
}

print_summary() {
  cat <<EOF

部署文件已准备完成。

项目目录：$PROJECT_DIR
配置文件：$PROJECT_DIR/data/settings.json
本地环境：$PROJECT_DIR/config/local.env
Hub API: http://127.0.0.1:3789/api/state

中文统一入口：$PROJECT_DIR/一键部署.command
仓库配置菜单：npm run ncc -- setup
EOF
}

main() {
  local mode="${1:-}"
  log "开始部署 Codex QQ Bot。"
  log "项目目录：$PROJECT_DIR"
  mark_fresh_setup_pending
  [ -f "$BOOTSTRAP_SCRIPT" ] || die "找不到环境自举器：$BOOTSTRAP_SCRIPT"
  log "自动补齐基础工具、Node.js 20+、Codex CLI，以及受支持平台上的 NapCat/OneBot 运行环境。"
  bash "$BOOTSTRAP_SCRIPT" --all
  export PATH="$HOME/.local/share/codex-qq-bot/node/bin:$HOME/.local/bin:$PATH"
  ensure_project_files
  write_local_env_defaults
  ensure_npm_ready
  install_ncc_shortcut
  print_summary
  if [ "$mode" = "--prepare-only" ]; then
    return
  fi
  if ask_yes_no "现在打开 ncc 快捷配置吗？" "Y"; then
    NCC_ENVIRONMENT_PREPARED=1 "$NCC_SOURCE" first-run
  fi
}

main "$@"
