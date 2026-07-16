#!/usr/bin/env bash

set -Eeuo pipefail

REPOSITORY="${CODEX_QQ_BOT_REPOSITORY:-gl813788-byte/codex-qq-bot}"
RELEASE_API_URL="${CODEX_QQ_BOT_RELEASE_API_URL:-https://api.github.com/repos/${REPOSITORY}/releases/latest}"
INSTALL_DIR="${CODEX_QQ_BOT_INSTALL_DIR:-}"
ARCHIVE_FILE="${CODEX_QQ_BOT_ARCHIVE_FILE:-}"
NO_LAUNCH="${CODEX_QQ_BOT_NO_LAUNCH:-0}"
CHECK_ONLY=0
WORK_DIR=""

log() {
  printf '\n[Codex QQ Bot 安装器] %s\n' "$*"
}

die() {
  printf '\n[Codex QQ Bot 安装器] 错误：%s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Codex QQ Bot 中文安装器

推荐命令：
  npx -y codex-qq-bot
  pnpm dlx codex-qq-bot

未安装 Node.js 时可使用：
  curl -fsSL https://raw.githubusercontent.com/gl813788-byte/codex-qq-bot/main/install.sh | bash

安装器会自动获取最新 GitHub Release ZIP、校验摘要和压缩包结构，安装到稳定目录，
然后进入仓库版 ncc 的中文首次部署。整个过程不需要打开 GitHub 网页。

选项：
  --check                 只检查最新版本和下载地址，不安装
  --install-dir <目录>    指定项目安装目录
  --archive <ZIP>         从本地 ZIP 安装，适合离线或测试
  --no-launch             安装后暂不进入 ncc
  -h, --help              显示本帮助

环境变量：
  CODEX_QQ_BOT_INSTALL_DIR       默认安装目录
  CODEX_QQ_BOT_NO_LAUNCH=1       安装后暂不进入 ncc
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --check)
      CHECK_ONLY=1
      shift
      ;;
    --install-dir)
      [ "$#" -ge 2 ] || die "--install-dir 后面需要目录。"
      INSTALL_DIR="$2"
      shift 2
      ;;
    --archive)
      [ "$#" -ge 2 ] || die "--archive 后面需要 ZIP 路径。"
      ARCHIVE_FILE="$2"
      shift 2
      ;;
    --no-launch)
      NO_LAUNCH=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "不认识的参数：$1（运行 --help 查看用法）"
      ;;
  esac
done

if [ -z "$INSTALL_DIR" ]; then
  if [ "$(id -u)" -eq 0 ]; then
    INSTALL_DIR="/root/Codex-Remote-Contact"
  else
    INSTALL_DIR="$HOME/Codex-Remote-Contact"
  fi
fi

case "$INSTALL_DIR" in
  /*) ;;
  *) INSTALL_DIR="$(pwd)/$INSTALL_DIR" ;;
esac

run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    return 1
  fi
}

install_system_package() {
  local package="$1"
  if command -v brew >/dev/null 2>&1; then
    brew install "$package"
  elif command -v apt-get >/dev/null 2>&1; then
    run_privileged apt-get update && run_privileged apt-get install -y "$package"
  elif command -v dnf >/dev/null 2>&1; then
    run_privileged dnf install -y "$package"
  elif command -v yum >/dev/null 2>&1; then
    run_privileged yum install -y "$package"
  elif command -v pacman >/dev/null 2>&1; then
    run_privileged pacman -Sy --needed --noconfirm "$package"
  else
    return 1
  fi
}

ensure_command() {
  local command_name="$1"
  local package_name="$2"
  command -v "$command_name" >/dev/null 2>&1 && return 0
  log "缺少 ${command_name}，正在尝试自动安装 ${package_name}。"
  install_system_package "$package_name" || die "无法自动安装 ${package_name}，请安装后重试。"
  command -v "$command_name" >/dev/null 2>&1 || die "${package_name} 安装后仍不在 PATH 中。"
}

cleanup() {
  if [ -n "$WORK_DIR" ] && [ -d "$WORK_DIR" ]; then
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

RELEASE_TAG=""
ASSET_NAME=""
ASSET_URL=""
EXPECTED_SHA256=""

resolve_latest_release() {
  local metadata_file="$1"
  ensure_command curl curl
  log "正在查询最新正式版本……"
  curl -fsSL \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$RELEASE_API_URL" -o "$metadata_file" || die "无法读取最新 Release 信息，请检查网络后重试。"

  if command -v node >/dev/null 2>&1; then
    local parsed
    parsed="$(node - "$metadata_file" <<'NODE'
const fs = require("node:fs");
const release = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const asset = (release.assets || []).find((item) => /^codex-qq-bot-v[^/]+\.zip$/.test(item.name || ""));
if (!asset?.browser_download_url) process.exit(2);
const digest = String(asset.digest || "").replace(/^sha256:/i, "");
process.stdout.write([release.tag_name || "", asset.name, asset.browser_download_url, digest].join("\t"));
NODE
    )" || die "最新 Release 中没有找到项目 ZIP。"
    IFS=$'\t' read -r RELEASE_TAG ASSET_NAME ASSET_URL EXPECTED_SHA256 <<<"$parsed"
  else
    RELEASE_TAG="$(sed -n 's/^[[:space:]]*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' "$metadata_file" | head -n 1)"
    local parsed
    parsed="$(awk '
      /^[[:space:]]*"name":[[:space:]]*"codex-qq-bot-v[^\"]*\.zip"/ {
        active=1; name=$0; sub(/^.*"name":[[:space:]]*"/, "", name); sub(/".*$/, "", name)
      }
      active && /"digest":[[:space:]]*"sha256:/ {
        digest=$0; sub(/^.*"digest":[[:space:]]*"sha256:/, "", digest); sub(/".*$/, "", digest)
      }
      active && /"browser_download_url":[[:space:]]*"/ {
        url=$0; sub(/^.*"browser_download_url":[[:space:]]*"/, "", url); sub(/".*$/, "", url)
        print name "\t" url "\t" digest; exit
      }
    ' "$metadata_file")"
    IFS=$'\t' read -r ASSET_NAME ASSET_URL EXPECTED_SHA256 <<<"$parsed"
  fi

  [ -n "$RELEASE_TAG" ] || die "Release 信息缺少版本号。"
  [ -n "$ASSET_URL" ] || die "最新 Release 中没有找到项目 ZIP。"
}

calculate_sha256() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    return 1
  fi
}

verify_archive() {
  local archive="$1"
  local actual_sha256=""
  if [ -n "$EXPECTED_SHA256" ]; then
    actual_sha256="$(calculate_sha256 "$archive")" || die "系统缺少 SHA-256 校验工具。"
    actual_sha256="$(printf '%s' "$actual_sha256" | tr '[:upper:]' '[:lower:]')"
    EXPECTED_SHA256="$(printf '%s' "$EXPECTED_SHA256" | tr '[:upper:]' '[:lower:]')"
    [ "$actual_sha256" = "$EXPECTED_SHA256" ] || die "ZIP 摘要校验失败，已停止安装。"
    log "SHA-256 摘要校验通过。"
  else
    log "此安装源没有提供 SHA-256 摘要，将继续检查 ZIP 完整性和目录结构。"
  fi

  unzip -tq "$archive" >/dev/null || die "ZIP 完整性检查失败。"
  if unzip -Z1 "$archive" | awk '
    BEGIN { bad=0 }
    /^\// || /(^|\/)\.\.($|\/)/ { bad=1 }
    END { exit bad ? 0 : 1 }
  '; then
    die "ZIP 包含不安全路径，已停止安装。"
  fi
}

launch_ncc() {
  local launcher="$INSTALL_DIR/一键部署.command"
  [ -f "$launcher" ] || die "安装目录缺少一键部署入口：$launcher"
  chmod +x "$launcher" "$INSTALL_DIR/scripts/ncc.command" "$INSTALL_DIR/scripts/deploy.command" 2>/dev/null || true

  if [ "$NO_LAUNCH" = "1" ]; then
    log "安装已完成，按要求暂不启动。以后运行："
    printf '  %q\n' "$launcher"
    return 0
  fi

  log "正在进入中文 ncc。首次运行会检测环境、安装依赖并引导填写配置。"
  if [ -r /dev/tty ]; then
    "$launcher" </dev/tty
  else
    die "当前没有交互终端。请稍后直接运行：$launcher"
  fi
}

log "无需打开 GitHub 网页；安装器会自动完成下载、校验和解压。"

if [ -z "$ARCHIVE_FILE" ]; then
  WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-qq-bot-check.XXXXXX")"
  resolve_latest_release "$WORK_DIR/release.json"
  log "最新版本：${RELEASE_TAG}"
  printf '安装包：%s\n' "$ASSET_NAME"
  printf '目标目录：%s\n' "$INSTALL_DIR"
  if [ -n "$EXPECTED_SHA256" ]; then
    printf 'SHA-256：%s\n' "$EXPECTED_SHA256"
  fi
  if [ "$CHECK_ONLY" = "1" ]; then
    log "检查完成，没有下载或修改任何项目文件。"
    exit 0
  fi
elif [ "$CHECK_ONLY" = "1" ]; then
  [ -f "$ARCHIVE_FILE" ] || die "找不到本地 ZIP：$ARCHIVE_FILE"
  log "本地安装包可读取：$ARCHIVE_FILE"
  printf '目标目录：%s\n' "$INSTALL_DIR"
  log "检查完成，没有修改任何项目文件。"
  exit 0
fi

if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/scripts/ncc.command" ] && [ -f "$INSTALL_DIR/一键部署.command" ]; then
  log "发现已有项目，不会覆盖其中的配置、数据或代码：$INSTALL_DIR"
  launch_ncc
  exit 0
fi

if [ -e "$INSTALL_DIR" ]; then
  if [ -d "$INSTALL_DIR" ] && [ -z "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
    rmdir "$INSTALL_DIR" || die "无法使用空目录：$INSTALL_DIR"
  else
    die "目标路径已存在但不是可识别的项目，拒绝覆盖：$INSTALL_DIR"
  fi
fi

ensure_command unzip unzip
parent_dir="$(dirname "$INSTALL_DIR")"
mkdir -p "$parent_dir"
WORK_DIR="$(mktemp -d "$parent_dir/.codex-qq-bot-install.XXXXXX")"
downloaded_archive="$WORK_DIR/project.zip"

if [ -n "$ARCHIVE_FILE" ]; then
  [ -f "$ARCHIVE_FILE" ] || die "找不到本地 ZIP：$ARCHIVE_FILE"
  cp "$ARCHIVE_FILE" "$downloaded_archive"
  ASSET_NAME="$(basename "$ARCHIVE_FILE")"
  log "正在使用本地安装包：$ASSET_NAME"
else
  log "正在下载 ${ASSET_NAME}……"
  curl -fL --retry 3 --retry-delay 1 "$ASSET_URL" -o "$downloaded_archive" || die "下载失败，请检查网络后重试。"
fi

verify_archive "$downloaded_archive"
extract_dir="$WORK_DIR/extracted"
mkdir -p "$extract_dir"
unzip -q "$downloaded_archive" -d "$extract_dir"

archive_root="$(unzip -Z1 "$downloaded_archive" | awk -F/ 'NF && $1 != "" { print $1; exit }')"
[ -n "$archive_root" ] || die "ZIP 没有可安装内容。"
source_dir="$extract_dir/$archive_root"
[ -d "$source_dir" ] || die "ZIP 顶层目录无效。"
[ -f "$source_dir/package.json" ] || die "ZIP 缺少 package.json。"
[ -f "$source_dir/scripts/ncc.command" ] || die "ZIP 缺少仓库 ncc。"
[ -f "$source_dir/一键部署.command" ] || die "ZIP 缺少中文一键部署入口。"

mv "$source_dir" "$INSTALL_DIR" || die "无法写入目标目录：$INSTALL_DIR"
log "项目已安装到：$INSTALL_DIR"
launch_ncc
