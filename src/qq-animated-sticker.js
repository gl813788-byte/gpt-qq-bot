import { spawn } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

const defaultFfprobeCandidates = [
  process.env.CODEX_REMOTE_CONTACT_FFPROBE_PATH,
  "ffprobe",
  "/data/data/com.termux/files/usr/bin/ffprobe"
].filter(Boolean);

const defaultFfmpegCandidates = [
  process.env.CODEX_REMOTE_CONTACT_FFMPEG_PATH,
  "ffmpeg",
  "/data/data/com.termux/files/usr/bin/ffmpeg"
].filter(Boolean);

export async function inspectAnimatedSticker(filePath, { outputDir, selection = "中段3帧", maxFrames = 8, run = runProcess } = {}) {
  const probe = await probeAnimation(filePath, { run });
  if (!probe.animated) {
    return { ...probe, frames: [filePath] };
  }
  const effectiveSelection = String(selection || "").trim() || "中段3帧";
  const indexes = parseFrameSelection(effectiveSelection, probe.frameCount, { maxFrames });
  const frames = await extractSelectedFrames(filePath, {
    outputDir,
    indexes,
    run
  });
  return { ...probe, frames, indexes, selection: effectiveSelection };
}

export async function probeAnimation(filePath, { run = runProcess } = {}) {
  let lastError = null;
  for (const binary of defaultFfprobeCandidates) {
    try {
      const result = await run(binary, [
        "-v", "error",
        "-select_streams", "v:0",
        "-count_frames",
        "-show_entries", "stream=nb_read_frames,nb_frames,duration:format=duration",
        "-of", "json",
        filePath
      ]);
      const parsed = JSON.parse(result.stdout || "{}");
      const stream = Array.isArray(parsed.streams) ? parsed.streams[0] || {} : {};
      const frameCount = finiteNumber(stream.nb_read_frames) || finiteNumber(stream.nb_frames) || 1;
      const duration = finiteNumber(stream.duration) || finiteNumber(parsed.format?.duration) || 0;
      return { animated: frameCount > 1, frameCount, duration };
    } catch (error) {
      lastError = error;
      if (error?.code !== "ENOENT") break;
    }
  }
  if (lastError) throw lastError;
  return { animated: false, frameCount: 1, duration: 0 };
}

export async function extractSelectedFrames(filePath, {
  outputDir,
  indexes = [],
  run = runProcess
} = {}) {
  if (!outputDir) throw new Error("Animated sticker frame extraction requires outputDir");
  const selected = [...new Set((Array.isArray(indexes) ? indexes : [])
    .map((value) => Math.max(0, Math.floor(Number(value))))
    .filter(Number.isFinite))];
  if (!selected.length) throw new Error("Animated sticker frame selection is empty");
  await mkdir(outputDir, { recursive: true });
  const prefix = `${Date.now()}-${basename(filePath).replace(/[^A-Za-z0-9._-]+/g, "-")}-selected`;
  const pattern = join(outputDir, `${prefix}-%02d.png`);
  let lastError = null;
  for (const binary of defaultFfmpegCandidates) {
    try {
      const args = [
        "-hide_banner", "-loglevel", "error", "-i", filePath,
        "-vf", `select='${selected.map((index) => `eq(n\\,${index})`).join("+")}'`,
        "-fps_mode", "vfr", "-frames:v", String(selected.length), pattern
      ];
      await run(binary, args);
      const files = (await readdir(outputDir))
        .filter((name) => name.startsWith(prefix) && name.endsWith(".png"))
        .sort()
        .map((name) => join(outputDir, name));
      if (files.length) return files.slice(0, selected.length);
      throw new Error("ffmpeg did not create animation frames");
    } catch (error) {
      lastError = error;
      if (error?.code !== "ENOENT") break;
    }
  }
  throw lastError || new Error("ffmpeg is unavailable");
}

export function chooseMiddleFrameIndexes(frameCount, maxFrames = 3) {
  const count = Math.max(0, Math.floor(Number(frameCount) || 0));
  const wanted = Math.max(1, Math.min(8, Math.floor(Number(maxFrames) || 3)));
  if (count <= 1) return [];
  const middle = Math.floor((count - 1) / 2);
  const start = Math.max(0, Math.min(count - wanted, middle - Math.floor(wanted / 2)));
  return Array.from({ length: Math.min(wanted, count) }, (_, index) => start + index);
}

export function parseFrameSelection(selection, frameCount, { maxFrames = 8 } = {}) {
  const count = Math.max(0, Math.floor(Number(frameCount) || 0));
  if (count <= 1) return [];
  const limit = Math.max(1, Math.min(12, Math.floor(Number(maxFrames) || 8)));
  const text = String(selection || "").trim();
  const middleMatch = text.match(/(?:中间|中段)\s*([1-9][0-9]?)\s*帧?/i);
  if (middleMatch) return chooseMiddleFrameIndexes(count, Math.min(limit, Number(middleMatch[1])));
  const evenMatch = text.match(/(?:均匀|平均|全程)\s*([1-9][0-9]?)\s*帧?/i);
  if (evenMatch) {
    const wanted = Math.min(limit, count, Number(evenMatch[1]));
    if (wanted <= 1) return [Math.floor((count - 1) / 2)];
    return [...new Set(Array.from({ length: wanted }, (_, index) => Math.round(index * (count - 1) / (wanted - 1))))];
  }
  const indexes = [];
  for (const token of text.split(/[，,、\s]+/).filter(Boolean)) {
    const percent = token.match(/^([0-9]+(?:\.[0-9]+)?)%$/);
    const frame = token.match(/^(?:第|#)?([0-9]+)(?:帧)?$/i);
    let index = null;
    if (percent) index = Math.round((count - 1) * Math.max(0, Math.min(100, Number(percent[1]))) / 100);
    else if (frame) {
      // Human-facing frame numbers are one-based: “第1帧” is index 0.
      const requested = Number(frame[1]);
      index = Math.max(0, Math.min(count - 1, requested > 0 ? requested - 1 : 0));
    }
    if (index == null || indexes.includes(index)) continue;
    indexes.push(index);
    if (indexes.length >= limit) break;
  }
  return indexes;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function runProcess(command, args, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`${basename(command)} timed out`));
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout = (stdout + chunk).slice(-20000); });
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-20000); });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${basename(command)} exited with ${code}: ${stderr.trim().slice(-500)}`));
    });
  });
}
