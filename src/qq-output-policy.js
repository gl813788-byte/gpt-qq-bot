import { lstat, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve, sep } from "node:path";

const sendableImageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export function resolveQqMarkerPath(value, { projectDir } = {}) {
  const raw = String(value || "").trim();
  if (!raw || raw.includes("\0")) return "";

  let path = raw;
  if (/^file:\/\//i.test(raw)) {
    try {
      path = fileURLToPath(raw);
    } catch {
      return "";
    }
  }

  return resolve(projectDir || process.cwd(), isAbsolute(path) ? path : path);
}

export function isPathInside(filePath, rootPath) {
  const relativePath = relative(resolve(rootPath), resolve(filePath));
  return relativePath === ""
    || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath));
}

export async function resolveAllowedQqMarkerPath(value, {
  kind,
  event,
  projectDir,
  qqOutputImagesDir,
  qqStickerDir
} = {}) {
  const candidate = resolveQqMarkerPath(value, { projectDir });
  if (!candidate || !["image", "file"].includes(kind)) return "";

  const realCandidate = await realpath(candidate).catch(() => "");
  if (!realCandidate) return "";
  const info = await lstat(realCandidate).catch(() => null);
  if (!info?.isFile()) return "";

  if (kind === "image" && !sendableImageExtensions.has(extensionOf(realCandidate))) {
    return "";
  }

  const roots = allowedRoots(kind, { event, qqOutputImagesDir, qqStickerDir });
  for (const root of roots) {
    const realRoot = await realpath(root).catch(() => "");
    if (realRoot && isPathInside(realCandidate, realRoot)) return realCandidate;
  }
  return "";
}

function allowedRoots(kind, { event, qqOutputImagesDir, qqStickerDir }) {
  const roots = [];
  if (event?.qqTaskWorkspace?.outputDir) roots.push(event.qqTaskWorkspace.outputDir);
  if (kind === "image" && qqOutputImagesDir) roots.push(qqOutputImagesDir);
  if (kind === "image" && qqStickerDir) roots.push(qqStickerDir);
  return [...new Set(roots.map((root) => String(root || "").trim()).filter(Boolean))];
}

function extensionOf(filePath) {
  const index = String(filePath).lastIndexOf(".");
  return index >= 0 ? String(filePath).slice(index).toLowerCase() : "";
}
