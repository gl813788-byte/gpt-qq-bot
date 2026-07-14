import { spawn } from "node:child_process";

const defaultTimeoutMs = 15_000;
const defaultMaxOutputBytes = 2 * 1024 * 1024;

export function runProcess(command, args = [], {
  timeoutMs = defaultTimeoutMs,
  maxOutputBytes = defaultMaxOutputBytes,
  killGraceMs = 1_000,
  allowFailure = false,
  signal: optionsSignal,
  cwd,
  env,
  spawnProcess = spawn
} = {}) {
  return new Promise((resolve, reject) => {
    if (optionsSignal?.aborted) {
      reject(createAbortError(optionsSignal.reason));
      return;
    }
    const timeout = normalizePositiveInteger(timeoutMs, defaultTimeoutMs);
    const outputLimit = normalizePositiveInteger(maxOutputBytes, defaultMaxOutputBytes);
    const grace = normalizePositiveInteger(killGraceMs, 1_000);
    let child;
    try {
      child = spawnProcess(command, args, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      reject(error);
      return;
    }

    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let settled = false;
    let terminalError = null;
    let forceKillTimer = null;

    const terminate = (error) => {
      if (!terminalError) terminalError = error;
      try {
        child.kill("SIGTERM");
      } catch {
        // The process may already have exited.
      }
      if (!forceKillTimer) {
        forceKillTimer = setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            // The process exited during the grace window.
          }
        }, grace);
        forceKillTimer.unref?.();
      }
    };

    const collect = (target, chunk) => {
      const text = String(chunk || "");
      outputBytes += Buffer.byteLength(text);
      if (outputBytes > outputLimit) {
        const error = new Error(`${command} output exceeded ${outputLimit} bytes`);
        error.code = "PROCESS_OUTPUT_LIMIT";
        terminate(error);
        return target;
      }
      return target + text;
    };

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => { stdout = collect(stdout, chunk); });
    child.stderr?.on("data", (chunk) => { stderr = collect(stderr, chunk); });

    const timeoutTimer = setTimeout(() => {
      const error = new Error(`${command} timed out after ${timeout}ms`);
      error.code = "PROCESS_TIMEOUT";
      terminate(error);
    }, timeout);
    timeoutTimer.unref?.();

    const abortProcess = () => terminate(createAbortError(optionsSignal?.reason));
    optionsSignal?.addEventListener("abort", abortProcess, { once: true });
    if (optionsSignal?.aborted) abortProcess();

    const finish = (error, code = null, exitSignal = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      optionsSignal?.removeEventListener("abort", abortProcess);
      if (error || terminalError) {
        reject(error || terminalError);
        return;
      }
      if (code !== 0 && !allowFailure) {
        const detail = (stderr || stdout).trim().slice(-4_000);
        const failure = new Error(`${command} exited ${code}${exitSignal ? ` (${exitSignal})` : ""}${detail ? `: ${detail}` : ""}`);
        failure.code = "PROCESS_EXIT_ERROR";
        failure.exitCode = code;
        failure.signal = exitSignal;
        reject(failure);
        return;
      }
      resolve({ code, signal: exitSignal, stdout, stderr, output: `${stdout}${stderr}` });
    };

    child.once("error", (error) => finish(error));
    child.once("close", (code, exitSignal) => finish(null, code, exitSignal));
  });
}

export async function runJsonProcess(command, args = [], options = {}) {
  const result = await runProcess(command, args, options);
  const text = result.stdout.trim();
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch (error) {
    const parseError = new Error(`Unable to parse ${command} JSON output: ${error.message}`);
    parseError.code = "PROCESS_JSON_INVALID";
    throw parseError;
  }
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function createAbortError(reason) {
  if (reason instanceof Error) return reason;
  const error = new Error(reason == null ? "Process aborted" : String(reason));
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
}
