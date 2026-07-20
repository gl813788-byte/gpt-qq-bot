#!/usr/bin/env bash

set -u
set -o pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
NCC_SCRIPT="$PROJECT_DIR/scripts/ncc.command"
BOOTSTRAP_SCRIPT="$PROJECT_DIR/scripts/bootstrap-environment.sh"

log() {
  printf '\n[一键部署] %s\n' "$*"
}

die() {
  printf '\n[一键部署] 错误：%s\n' "$*" >&2
  exit 1
}

ask_yes_no() {
  local prompt="$1"
  local answer=""
  printf '%s [Y/n] ' "$prompt"
  read -r answer || true
  case "${answer:-Y}" in
    n|N|no|NO|否) return 1 ;;
    *) return 0 ;;
  esac
}

run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    return 1
  fi
}

install_zsh() {
  if command -v brew >/dev/null 2>&1; then
    brew list zsh >/dev/null 2>&1 || brew install zsh
  elif command -v apt-get >/dev/null 2>&1; then
    run_privileged apt-get update && run_privileged apt-get install -y zsh
  elif command -v dnf >/dev/null 2>&1; then
    run_privileged dnf install -y zsh
  elif command -v yum >/dev/null 2>&1; then
    run_privileged yum install -y zsh
  elif command -v pacman >/dev/null 2>&1; then
    run_privileged pacman -Sy --needed --noconfirm zsh
  else
    return 1
  fi
}

ensure_zsh() {
  command -v zsh >/dev/null 2>&1 && return 0
  log "首次启动需要 zsh，当前尚未安装。"
  ask_yes_no "是否自动安装 zsh？" || die "已取消安装。"
  install_zsh || die "无法自动安装 zsh，请手动安装后重试。"
  command -v zsh >/dev/null 2>&1 || die "zsh 安装后仍不在 PATH 中。"
}

[ -f "$NCC_SCRIPT" ] || die "找不到仓库 ncc：$NCC_SCRIPT"
if [ -f "$BOOTSTRAP_SCRIPT" ]; then
  log "正在自举首次启动需要的下载、解压和终端工具。"
  bash "$BOOTSTRAP_SCRIPT" --base-only
else
  ensure_zsh
fi
log "正在进入 ncc。首次运行会自动部署，完成后再运行就是日常功能菜单。"
exec zsh "$NCC_SCRIPT" "$@"
