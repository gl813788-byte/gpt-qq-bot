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
  printf '[deploy] Warning: %s\n' "$*" >&2
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
      log "Node.js $(node --version) found."
      return
    fi
    warn "Node.js $(node --version) is older than required v20."
  fi

  if ! ask_yes_no "Install or upgrade Node.js automatically?" "Y"; then
    warn "Skipping Node.js install. The hub requires Node.js 20+."
    return
  fi

  case "$(detect_os)" in
    macos)
      install_with_brew node || warn "Homebrew is missing. Install Node.js 20+ manually."
      ;;
    linux)
      install_with_apt nodejs || warn "Could not install nodejs with apt."
      install_with_apt npm || warn "Could not install npm with apt."
      ;;
    *)
      warn "Unsupported OS for automatic Node.js install."
      ;;
  esac
}

ensure_basic_tools() {
  for cmd in curl git; do
    if command -v "$cmd" >/dev/null 2>&1; then
      log "$cmd found."
      continue
    fi
    if ask_yes_no "Install missing tool '$cmd' automatically?" "Y"; then
      case "$(detect_os)" in
        macos) install_with_brew "$cmd" || warn "Could not install $cmd with brew." ;;
        linux) install_with_apt "$cmd" || warn "Could not install $cmd with apt." ;;
      esac
    fi
  done
}

ensure_codex() {
  if command -v codex >/dev/null 2>&1; then
    log "Codex CLI found: $(command -v codex)"
    return
  fi
  warn "Codex CLI was not found."
  if command -v npm >/dev/null 2>&1 && ask_yes_no "Try installing Codex CLI with npm globally?" "Y"; then
    npm install -g @openai/codex || warn "Codex CLI install failed. You can still finish setup after installing it manually."
  else
    warn "Install Codex CLI manually before enabling AI replies."
  fi
}

ensure_project_files() {
  mkdir -p "$PROJECT_DIR/data" "$PROJECT_DIR/config" "$PROJECT_DIR/runtime/logs" "$PROJECT_DIR/runtime/replies" "$PROJECT_DIR/workspaces/codex-cli"
  touch "$PROJECT_DIR/runtime/logs/.gitkeep" "$PROJECT_DIR/runtime/replies/.gitkeep"
  if [ ! -f "$PROJECT_DIR/data/settings.json" ]; then
    cp "$PROJECT_DIR/config/settings.example.json" "$PROJECT_DIR/data/settings.json"
    log "Created data/settings.json from example."
  fi
  for file in imessage-memory.json remote-execution-memory.json unified-memory.json; do
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
    log "No package-lock.json; skipping npm install. This project currently uses built-in Node modules."
  fi
}

install_ncc_shortcut() {
  chmod +x "$NCC_SOURCE"
  if [ -w "$(dirname "$NCC_TARGET_SYSTEM")" ]; then
    ln -sf "$NCC_SOURCE" "$NCC_TARGET_SYSTEM"
    log "Installed ncc shortcut: $NCC_TARGET_SYSTEM"
    return
  fi

  mkdir -p "$LOCAL_BIN"
  ln -sf "$NCC_SOURCE" "$NCC_TARGET_USER"
  log "Installed ncc shortcut: $NCC_TARGET_USER"
  case ":$PATH:" in
    *":$LOCAL_BIN:"*) ;;
    *) warn "$LOCAL_BIN is not on PATH. Add this to your shell profile: export PATH=\"$LOCAL_BIN:\$PATH\"" ;;
  esac
}

print_summary() {
  cat <<EOF

Deployment files are ready.

Project: $PROJECT_DIR
Settings: $PROJECT_DIR/data/settings.json
Local env: $PROJECT_DIR/config/local.env
WebUI: http://127.0.0.1:3789

The ncc shortcut will open the quick configuration menu.
EOF
}

main() {
  log "Starting GPT QQ Bot deployment."
  log "Project directory: $PROJECT_DIR"
  ensure_basic_tools
  ensure_node
  ensure_codex
  ensure_project_files
  write_local_env_defaults
  ensure_npm_ready
  install_ncc_shortcut
  print_summary
  if ask_yes_no "Open ncc quick configuration now?" "Y"; then
    "$NCC_SOURCE" setup
  fi
}

main "$@"
