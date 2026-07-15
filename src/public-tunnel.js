import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { delimiter, isAbsolute, join } from "node:path";

const CLOUDFLARE_QUICK_TUNNEL_HOST_SUFFIX = ".trycloudflare.com";
const CLOUDFLARE_QUICK_TUNNEL_URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/i;

export function extractCloudflareQuickTunnelUrl(value) {
  const match = String(value || "").match(CLOUDFLARE_QUICK_TUNNEL_URL_PATTERN);
  if (!match) return null;
  try {
    const url = new URL(match[0]);
    if (url.protocol !== "https:" || !url.hostname.toLowerCase().endsWith(CLOUDFLARE_QUICK_TUNNEL_HOST_SUFFIX)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function isPublicTunnelRequestHost(requestHost, publicUrl) {
  if (!requestHost || !publicUrl) return false;
  try {
    const expectedHost = new URL(publicUrl).host.toLowerCase();
    return normalizeHost(requestHost) === normalizeHost(expectedHost);
  } catch {
    return false;
  }
}

export function isPublicTunnelRequestOrigin(requestOrigin, publicUrl) {
  if (!requestOrigin || !publicUrl) return false;
  try {
    const originUrl = new URL(requestOrigin);
    const activeUrl = new URL(publicUrl);
    return originUrl.protocol === "https:"
      && !originUrl.username
      && !originUrl.password
      && originUrl.pathname === "/"
      && !originUrl.search
      && !originUrl.hash
      && originUrl.origin === activeUrl.origin;
  } catch {
    return false;
  }
}

export async function findExecutable(command, {
  env = process.env,
  accessFile = access,
  platform = process.platform
} = {}) {
  const executable = String(command || "").trim();
  if (!executable) return null;
  const extensions = platform === "win32"
    ? String(env.PATHEXT || ".EXE;.CMD;.BAT").split(";").filter(Boolean)
    : [""];
  const candidates = isAbsolute(executable) || executable.includes("/") || executable.includes("\\")
    ? extensions.map((extension) => executable.endsWith(extension) ? executable : `${executable}${extension}`)
    : String(env.PATH || "").split(delimiter).filter(Boolean)
        .flatMap((directory) => extensions.map((extension) => join(directory, `${executable}${extension}`)));

  for (const candidate of candidates) {
    try {
      await accessFile(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue searching the remaining PATH entries.
    }
  }
  return null;
}

export function createPublicTunnelManager({
  targetUrl,
  spawnProcess = spawn,
  resolveExecutable = () => findExecutable("cloudflared"),
  startupTimeoutMs = 20_000,
  stopTimeoutMs = 3_000,
  now = () => new Date().toISOString()
}) {
  const normalizedTargetUrl = normalizeLoopbackTargetUrl(targetUrl);
  let activeProcess = null;
  let startOperation = null;
  let availabilityChecked = false;
  let executablePath = null;
  const expectedExits = new WeakSet();
  const runtime = {
    starting: false,
    running: false,
    publicUrl: null,
    startedAt: null,
    lastError: null
  };

  function status() {
    return {
      provider: "cloudflare",
      dependency: "cloudflared",
      available: availabilityChecked ? Boolean(executablePath) : null,
      starting: runtime.starting,
      running: runtime.running,
      publicUrl: runtime.publicUrl,
      startedAt: runtime.startedAt,
      lastError: runtime.lastError
    };
  }

  async function refreshAvailability() {
    executablePath = await resolveExecutable();
    availabilityChecked = true;
    return status();
  }

  function start() {
    if (runtime.running) return Promise.resolve(status());
    if (startOperation) return startOperation;
    startOperation = startTunnel().finally(() => {
      startOperation = null;
    });
    return startOperation;
  }

  async function startTunnel() {
    runtime.starting = true;
    runtime.lastError = null;
    runtime.publicUrl = null;
    runtime.startedAt = null;
    try {
      if (!availabilityChecked || !executablePath) await refreshAvailability();
      if (!executablePath) {
        throw createTunnelError(
          "cloudflared is not installed or is not available on PATH",
          "PUBLIC_TUNNEL_DEPENDENCY_MISSING"
        );
      }

      const child = spawnProcess(executablePath, [
        "tunnel",
        "--no-autoupdate",
        "--url",
        normalizedTargetUrl
      ], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      activeProcess = child;
      const publicUrl = await waitForQuickTunnelUrl(child);
      runtime.starting = false;
      runtime.running = true;
      runtime.publicUrl = publicUrl;
      runtime.startedAt = now();
      runtime.lastError = null;
      return status();
    } catch (error) {
      const failureMessage = compactDiagnostic(error?.message);
      if (activeProcess) await stop();
      runtime.starting = false;
      runtime.running = false;
      runtime.publicUrl = null;
      runtime.startedAt = null;
      runtime.lastError = error?.code === "PUBLIC_TUNNEL_STOPPED" ? null : failureMessage;
      if (!error.statusCode) error.statusCode = 503;
      throw error;
    }
  }

  function waitForQuickTunnelUrl(child) {
    return new Promise((resolveStart, rejectStart) => {
      let settled = false;
      let output = "";
      const startupTimer = setTimeout(() => {
        const error = createTunnelError(
          `cloudflared did not provide a Quick Tunnel URL within ${startupTimeoutMs}ms`,
          "PUBLIC_TUNNEL_START_TIMEOUT"
        );
        runtime.lastError = error.message;
        expectedExits.add(child);
        try { child.kill("SIGTERM"); } catch { /* The process may already be gone. */ }
        settleReject(error);
      }, startupTimeoutMs);
      startupTimer.unref?.();

      const appendOutput = (chunk) => {
        output = `${output}${String(chunk || "")}`.slice(-8_000);
        const publicUrl = extractCloudflareQuickTunnelUrl(output);
        if (!publicUrl || settled) return;
        settled = true;
        clearTimeout(startupTimer);
        resolveStart(publicUrl);
      };
      child.stdout?.on("data", appendOutput);
      child.stderr?.on("data", appendOutput);

      const settleReject = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(startupTimer);
        rejectStart(error);
      };

      child.once("error", (error) => {
        if (activeProcess === child) activeProcess = null;
        const wrapped = createTunnelError(
          compactDiagnostic(error?.message || "Unable to start cloudflared"),
          "PUBLIC_TUNNEL_PROCESS_ERROR"
        );
        runtime.running = false;
        runtime.publicUrl = null;
        runtime.startedAt = null;
        if (!expectedExits.has(child)) runtime.lastError = wrapped.message;
        settleReject(wrapped);
      });

      child.once("exit", (code, signal) => {
        if (activeProcess === child) activeProcess = null;
        runtime.starting = false;
        runtime.running = false;
        runtime.publicUrl = null;
        runtime.startedAt = null;
        const expected = expectedExits.has(child);
        const diagnostic = latestProcessDiagnostic(output);
        const message = diagnostic || `cloudflared exited (${signal || code || "unknown"})`;
        if (!expected) runtime.lastError = message;
        settleReject(createTunnelError(message, expected ? "PUBLIC_TUNNEL_STOPPED" : "PUBLIC_TUNNEL_PROCESS_EXITED"));
      });
    });
  }

  async function stop() {
    const child = activeProcess;
    runtime.starting = false;
    runtime.running = false;
    runtime.publicUrl = null;
    runtime.startedAt = null;
    runtime.lastError = null;
    if (!child) return status();
    expectedExits.add(child);

    await new Promise((resolveStop) => {
      let stopped = false;
      const finish = () => {
        if (stopped) return;
        stopped = true;
        clearTimeout(forceTimer);
        resolveStop();
      };
      const forceTimer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch { /* The process may already be gone. */ }
        finish();
      }, stopTimeoutMs);
      forceTimer.unref?.();
      child.once("exit", finish);
      child.once("error", finish);
      try {
        if (child.exitCode !== null || child.signalCode !== null) finish();
        else child.kill("SIGTERM");
      } catch {
        finish();
      }
    });
    if (activeProcess === child) activeProcess = null;
    return status();
  }

  return {
    refreshAvailability,
    start,
    stop,
    status,
    isRequestHost: (requestHost) => isPublicTunnelRequestHost(requestHost, runtime.publicUrl),
    isRequestOrigin: (requestOrigin) => isPublicTunnelRequestOrigin(requestOrigin, runtime.publicUrl)
  };
}

function normalizeLoopbackTargetUrl(value) {
  const url = new URL(String(value || ""));
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) {
    throw new TypeError("Public tunnel target must be an HTTP loopback URL");
  }
  return url.origin;
}

function normalizeHost(value) {
  return String(value || "").trim().toLowerCase().replace(/\.$/, "");
}

function createTunnelError(message, code) {
  const error = new Error(compactDiagnostic(message));
  error.code = code;
  error.statusCode = 503;
  return error;
}

function latestProcessDiagnostic(value) {
  const lines = String(value || "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d{4}-\d{2}-\d{2}T\S+\s+(?:INF|WRN|ERR)\s*/i, "").trim())
    .filter(Boolean)
    .filter((line) => !extractCloudflareQuickTunnelUrl(line));
  return compactDiagnostic(lines.at(-1));
}

function compactDiagnostic(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.slice(0, 500) || null;
}
