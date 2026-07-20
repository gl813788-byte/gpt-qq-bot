#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODE="all"
DRY_RUN="${CODEX_QQ_BOT_BOOTSTRAP_DRY_RUN:-0}"
FORCE_MISSING=" ${CODEX_QQ_BOT_BOOTSTRAP_FORCE_MISSING:-} "
FORCE_NODE_INSTALL="${CODEX_QQ_BOT_BOOTSTRAP_FORCE_NODE_INSTALL:-0}"
FORCE_NAPCAT_INSTALL="${CODEX_QQ_BOT_BOOTSTRAP_FORCE_NAPCAT_INSTALL:-0}"
USER_PREFIX="${CODEX_QQ_BOT_USER_PREFIX:-${HOME:?HOME 未设置}/.local}"
MANAGED_NODE_HOME="${CODEX_QQ_BOT_MANAGED_NODE_HOME:-$USER_PREFIX/share/codex-qq-bot/node}"
CACHE_DIR="${CODEX_QQ_BOT_BOOTSTRAP_CACHE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/codex-qq-bot/bootstrap}"
NAPCAT_HOME="${CODEX_QQ_BOT_NAPCAT_HOME:-$HOME/Napcat}"
NAPCAT_MODE="${CODEX_QQ_BOT_INSTALL_NAPCAT:-auto}"
NODE_MAJOR="${CODEX_QQ_BOT_NODE_MAJOR:-22}"
NAPCAT_INSTALLER_URL="${CODEX_QQ_BOT_NAPCAT_INSTALLER_URL:-https://raw.githubusercontent.com/NapNeko/NapCat-Installer/main/script/install.sh}"

export PATH="$MANAGED_NODE_HOME/bin:$USER_PREFIX/bin:$PATH"

log() {
  printf '[环境自举] %s\n' "$*"
}

warn() {
  printf '[环境自举] 提示：%s\n' "$*" >&2
}

die() {
  printf '[环境自举] 错误：%s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Codex QQ Bot 环境自举器

用法：
  bash scripts/bootstrap-environment.sh [--all|--base-only|--check|--dry-run]

  --all        补齐基础工具、Node.js 20+、Codex CLI 和受支持平台上的 NapCat（默认）
  --base-only  只补齐进入 ncc 所需的基础工具
  --check      只报告当前环境，不安装
  --dry-run    打印全新环境安装计划，不修改系统

环境变量：
  CODEX_QQ_BOT_INSTALL_NAPCAT=auto|required|skip
  CODEX_QQ_BOT_NODE_MAJOR=22
  CODEX_QQ_BOT_BOOTSTRAP_CACHE_DIR=<目录>
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --all) MODE="all" ;;
    --base-only) MODE="base" ;;
    --check) MODE="check" ;;
    --dry-run) DRY_RUN="1" ;;
    -h|--help) usage; exit 0 ;;
    *) die "不认识的参数：$1" ;;
  esac
  shift
done

detect_os() {
  if [ -n "${CODEX_QQ_BOT_BOOTSTRAP_OS:-}" ]; then
    printf '%s\n' "$CODEX_QQ_BOT_BOOTSTRAP_OS"
    return
  fi
  case "$(uname -s)" in
    Darwin) printf 'macos\n' ;;
    Linux) printf 'linux\n' ;;
    *) printf 'unknown\n' ;;
  esac
}

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64) printf 'x64\n' ;;
    arm64|aarch64) printf 'arm64\n' ;;
    *) printf 'unknown\n' ;;
  esac
}

detect_package_manager() {
  if [ -n "${CODEX_QQ_BOT_BOOTSTRAP_PACKAGE_MANAGER:-}" ]; then
    printf '%s\n' "$CODEX_QQ_BOT_BOOTSTRAP_PACKAGE_MANAGER"
  elif command -v brew >/dev/null 2>&1; then
    printf 'brew\n'
  elif command -v apt-get >/dev/null 2>&1; then
    printf 'apt-get\n'
  elif command -v dnf >/dev/null 2>&1; then
    printf 'dnf\n'
  elif command -v yum >/dev/null 2>&1; then
    printf 'yum\n'
  elif command -v pacman >/dev/null 2>&1; then
    printf 'pacman\n'
  else
    printf 'none\n'
  fi
}

has_command() {
  local command_name="$1"
  case "$FORCE_MISSING" in
    *" $command_name "*) return 1 ;;
  esac
  command -v "$command_name" >/dev/null 2>&1
}

run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    die "安装系统依赖需要管理员权限；请给当前用户 sudo 权限后重新运行。"
  fi
}

install_packages() {
  [ "$#" -gt 0 ] || return 0
  local manager="$1"
  shift
  if [ "$DRY_RUN" = "1" ]; then
    log "计划通过 $manager 安装：$*"
    return 0
  fi
  case "$manager" in
    brew) brew install "$@" ;;
    apt-get)
      run_privileged apt-get update
      run_privileged apt-get install -y "$@"
      ;;
    dnf) run_privileged dnf install -y "$@" ;;
    yum) run_privileged yum install -y "$@" ;;
    pacman) run_privileged pacman -Sy --needed --noconfirm "$@" ;;
    *) die "没有检测到受支持的包管理器，无法补齐：$*" ;;
  esac
}

append_package_for_command() {
  local manager="$1"
  local command_name="$2"
  local package_name="$3"
  has_command "$command_name" || MISSING_PACKAGES+=("$package_name")
}

ensure_base_tools() {
  local manager="$1"
  MISSING_PACKAGES=()
  append_package_for_command "$manager" curl curl
  append_package_for_command "$manager" git git
  append_package_for_command "$manager" unzip unzip
  append_package_for_command "$manager" zip zip
  append_package_for_command "$manager" jq jq
  append_package_for_command "$manager" zsh zsh
  append_package_for_command "$manager" screen screen
  append_package_for_command "$manager" tar tar
  case "$manager" in
    apt-get)
      append_package_for_command "$manager" xz xz-utils
      append_package_for_command "$manager" pgrep procps
      has_command sha256sum || MISSING_PACKAGES+=(coreutils)
      has_command sudo || MISSING_PACKAGES+=(sudo)
      ;;
    dnf|yum)
      append_package_for_command "$manager" xz xz
      append_package_for_command "$manager" pgrep procps-ng
      has_command sha256sum || MISSING_PACKAGES+=(coreutils)
      has_command sudo || MISSING_PACKAGES+=(sudo)
      ;;
    pacman)
      append_package_for_command "$manager" xz xz
      append_package_for_command "$manager" pgrep procps-ng
      has_command sha256sum || MISSING_PACKAGES+=(coreutils)
      has_command sudo || MISSING_PACKAGES+=(sudo)
      ;;
  esac
  if [ "${#MISSING_PACKAGES[@]}" -gt 0 ]; then
    log "检测到缺失的基础工具，开始自动补齐。"
    install_packages "$manager" "${MISSING_PACKAGES[@]}"
  else
    log "基础下载、解压和终端工具已齐全。"
  fi
}

node_is_usable() {
  [ "$FORCE_NODE_INSTALL" != "1" ] || return 1
  has_command node && has_command npm && [ "$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf '0')" -ge 20 ]
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

install_managed_node() {
  local os="$1"
  local arch="$2"
  local platform=""
  case "$os:$arch" in
    linux:x64) platform="linux-x64" ;;
    linux:arm64) platform="linux-arm64" ;;
    macos:x64) platform="darwin-x64" ;;
    macos:arm64) platform="darwin-arm64" ;;
    *) die "当前平台没有可用的 Node.js 官方二进制：$os/$arch" ;;
  esac

  local dist_url="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x"
  if [ "$DRY_RUN" = "1" ]; then
    log "计划从 Node.js 官方发行页安装 v${NODE_MAJOR}.x（$platform），并校验 SHA-256。"
    return 0
  fi

  mkdir -p "$CACHE_DIR" "$USER_PREFIX/share/codex-qq-bot"
  local sums_file="$CACHE_DIR/node-v${NODE_MAJOR}-SHASUMS256.txt"
  curl -fL --retry 3 "$dist_url/SHASUMS256.txt" -o "$sums_file"
  local archive_name=""
  archive_name="$(awk -v suffix="-$platform.tar.xz" '$2 ~ suffix "$" { print $2; exit }' "$sums_file")"
  [ -n "$archive_name" ] || die "Node.js 校验清单里没有 $platform 安装包。"
  local expected=""
  expected="$(awk -v name="$archive_name" '$2 == name { print $1; exit }' "$sums_file")"
  local archive_file="$CACHE_DIR/$archive_name"
  if [ ! -f "$archive_file" ] || [ "$(sha256_file "$archive_file" 2>/dev/null || true)" != "$expected" ]; then
    curl -fL --retry 3 "$dist_url/$archive_name" -o "${archive_file}.part"
    mv "${archive_file}.part" "$archive_file"
  fi
  [ "$(sha256_file "$archive_file")" = "$expected" ] || die "Node.js 安装包 SHA-256 校验失败。"

  local stage="$USER_PREFIX/share/codex-qq-bot/node.new.$$"
  local previous="$USER_PREFIX/share/codex-qq-bot/node.previous.$$"
  rm -rf "$stage" "$previous"
  mkdir -p "$stage"
  tar -xJf "$archive_file" --strip-components=1 -C "$stage"
  if [ -e "$MANAGED_NODE_HOME" ]; then
    mv "$MANAGED_NODE_HOME" "$previous"
  fi
  mv "$stage" "$MANAGED_NODE_HOME"
  rm -rf "$previous"
  export PATH="$MANAGED_NODE_HOME/bin:$USER_PREFIX/bin:$PATH"
  hash -r
  FORCE_NODE_INSTALL="0"
  node_is_usable || die "Node.js 安装完成后仍不可用。"
  log "已安装隔离的 Node.js $(node --version)：$MANAGED_NODE_HOME"
}

ensure_node() {
  if node_is_usable; then
    log "Node.js 与 npm 已满足要求：$(node --version)"
    return
  fi
  log "没有可用的 Node.js 20+，开始安装项目自管版本。"
  install_managed_node "$1" "$2"
}

ensure_codex() {
  if has_command codex; then
    log "Codex CLI 已安装：$(command -v codex)"
    return
  fi
  if [ "$DRY_RUN" = "1" ]; then
    log "计划用 npm 安装 Codex CLI 到 $USER_PREFIX。"
    return
  fi
  npm install --global --prefix "$USER_PREFIX" @openai/codex
  export PATH="$USER_PREFIX/bin:$PATH"
  hash -r
  has_command codex || die "Codex CLI 安装完成后仍不在 PATH 中。"
  log "Codex CLI 已安装：$(command -v codex)"
}

napcat_is_installed() {
  [ "$FORCE_NAPCAT_INSTALL" != "1" ] || return 1
  [ -x "$NAPCAT_HOME/opt/QQ/qq" ] && [ -d "$NAPCAT_HOME/opt/QQ/resources/app/app_launcher/napcat" ]
}

ensure_napcat() {
  local os="$1"
  local manager="$2"
  case "$NAPCAT_MODE" in
    skip)
      log "已按配置跳过 NapCat；将复用用户提供的 OneBot。"
      return
      ;;
    auto|required) ;;
    *) die "CODEX_QQ_BOT_INSTALL_NAPCAT 只能是 auto、required 或 skip。" ;;
  esac
  if napcat_is_installed; then
    log "已找到 NapCat：$NAPCAT_HOME"
    return
  fi
  if [ "$os" != "linux" ] || { [ "$manager" != "apt-get" ] && [ "$manager" != "dnf" ]; }; then
    if [ "$NAPCAT_MODE" = "required" ]; then
      die "NapCat 官方 Shell 安装器目前只支持 apt-get/dnf Linux；当前是 $os/$manager。"
    fi
    warn "当前平台不在 NapCat 官方 Shell 自动安装范围内；Hub 依赖已补齐，请配置兼容 OneBot。"
    return
  fi
  if [ "$DRY_RUN" = "1" ]; then
    log "计划下载 NapCat 官方安装器并以 Rootless Shell 模式安装 LinuxQQ、NapCat 和运行库。"
    return
  fi

  mkdir -p "$CACHE_DIR"
  local installer="$CACHE_DIR/napcat-installer.sh"
  curl -fL --retry 3 "$NAPCAT_INSTALLER_URL" -o "${installer}.part"
  mv "${installer}.part" "$installer"
  bash -n "$installer" || die "NapCat 官方安装脚本语法检查失败。"
  local work_dir=""
  work_dir="$(mktemp -d "${TMPDIR:-/tmp}/codex-qq-bot-napcat.XXXXXX")"
  (
    cd "$work_dir"
    TERM="${TERM:-xterm}" bash "$installer" --docker n --cli n --proxy 0
  )
  rm -rf "$work_dir"
  FORCE_NAPCAT_INSTALL="0"
  napcat_is_installed || die "NapCat 官方安装器执行完成，但没有找到 $NAPCAT_HOME/opt/QQ/qq。"
  log "NapCat、LinuxQQ 与图形运行依赖已安装：$NAPCAT_HOME"
}

report_environment() {
  printf '系统：%s/%s\n' "$1" "$2"
  printf '包管理器：%s\n' "$3"
  printf 'Node.js：%s\n' "$(command -v node >/dev/null 2>&1 && node --version || printf '未安装')"
  printf 'npm：%s\n' "$(command -v npm >/dev/null 2>&1 && npm --version || printf '未安装')"
  printf 'Codex CLI：%s\n' "$(command -v codex 2>/dev/null || printf '未安装')"
  if napcat_is_installed; then
    printf 'NapCat：%s\n' "$NAPCAT_HOME"
  else
    printf 'NapCat：未安装或使用外部 OneBot\n'
  fi
}

OS_NAME="$(detect_os)"
ARCH_NAME="$(detect_arch)"
PACKAGE_MANAGER="$(detect_package_manager)"

log "检测结果：$OS_NAME/$ARCH_NAME，包管理器 $PACKAGE_MANAGER。"
if [ "$MODE" = "check" ]; then
  report_environment "$OS_NAME" "$ARCH_NAME" "$PACKAGE_MANAGER"
  exit 0
fi

ensure_base_tools "$PACKAGE_MANAGER"
[ "$MODE" = "base" ] && exit 0
ensure_node "$OS_NAME" "$ARCH_NAME"
ensure_codex
ensure_napcat "$OS_NAME" "$PACKAGE_MANAGER"
log "全套环境依赖已准备完成。"
