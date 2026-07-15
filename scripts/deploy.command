#!/usr/bin/env zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NCC_SOURCE="$PROJECT_DIR/scripts/ncc.command"
LOCAL_BIN="$HOME/.local/bin"
NCC_TARGET_USER="$LOCAL_BIN/ncc"
NCC_TARGET_SYSTEM="/usr/local/bin/ncc"

log() {
  printf '[deploy] %s\n' "$*"
}

warn() {
  printf '[deploy] 警告：%s\n' "$*" >&2
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
  local env_file="$PROJECT_DIR/config/local.env"
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

ensure_npm_ready() {
  if [ -f "$PROJECT_DIR/package-lock.json" ]; then
    (cd "$PROJECT_DIR" && npm install)
  else
    log "没有 package-lock.json，跳过 npm install。当前项目只使用 Node 内置模块。"
  fi
}

install_ncc_shortcut() {
  chmod +x "$NCC_SOURCE"
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

ncc 快捷命令会打开快速配置菜单。
EOF
}

main() {
  log "开始部署 Codex QQ Bot。"
  log "项目目录：$PROJECT_DIR"
  ensure_basic_tools
  ensure_node
  ensure_codex
  ensure_project_files
  write_local_env_defaults
  ensure_npm_ready
  install_ncc_shortcut
  print_summary
  if ask_yes_no "现在打开 ncc 快捷配置吗？" "Y"; then
    "$NCC_SOURCE" setup
  fi
}

main "$@"
