import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";
import {
  createPublicTunnelManager,
  extractCloudflareQuickTunnelUrl,
  findExecutable,
  isPublicTunnelRequestOrigin,
  isPublicTunnelRequestHost
} from "../src/public-tunnel.js";

test("extracts only Cloudflare Quick Tunnel HTTPS URLs", () => {
  assert.equal(
    extractCloudflareQuickTunnelUrl("INF Your quick Tunnel has been created! https://quiet-bird.trycloudflare.com"),
    "https://quiet-bird.trycloudflare.com"
  );
  assert.equal(extractCloudflareQuickTunnelUrl("https://example.com"), null);
  assert.equal(extractCloudflareQuickTunnelUrl("http://quiet-bird.trycloudflare.com"), null);
});

test("matches only the active public tunnel host", () => {
  const publicUrl = "https://quiet-bird.trycloudflare.com";
  assert.equal(isPublicTunnelRequestHost("quiet-bird.trycloudflare.com", publicUrl), true);
  assert.equal(isPublicTunnelRequestHost("QUIET-BIRD.TRYCLOUDFLARE.COM.", publicUrl), true);
  assert.equal(isPublicTunnelRequestHost("other.trycloudflare.com", publicUrl), false);
  assert.equal(isPublicTunnelRequestHost("quiet-bird.trycloudflare.com.evil.example", publicUrl), false);
});

test("matches only the active HTTPS public tunnel origin", () => {
  const publicUrl = "https://quiet-bird.trycloudflare.com";
  assert.equal(isPublicTunnelRequestOrigin("https://quiet-bird.trycloudflare.com", publicUrl), true);
  assert.equal(isPublicTunnelRequestOrigin("http://quiet-bird.trycloudflare.com", publicUrl), false);
  assert.equal(isPublicTunnelRequestOrigin("https://other.trycloudflare.com", publicUrl), false);
  assert.equal(isPublicTunnelRequestOrigin("https://quiet-bird.trycloudflare.com/path", publicUrl), false);
  assert.equal(isPublicTunnelRequestOrigin("https://quiet-bird.trycloudflare.com.evil.example", publicUrl), false);
});

test("finds cloudflared only from executable PATH entries", async () => {
  const checked = [];
  const executable = await findExecutable("cloudflared", {
    env: { PATH: "/missing:/opt/bin" },
    platform: "linux",
    accessFile: async (candidate) => {
      checked.push(candidate);
      if (candidate !== "/opt/bin/cloudflared") throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }
  });
  assert.equal(executable, "/opt/bin/cloudflared");
  assert.deepEqual(checked, ["/missing/cloudflared", "/opt/bin/cloudflared"]);
});

test("reports a missing cloudflared dependency without spawning", async () => {
  let spawnCalls = 0;
  const manager = createPublicTunnelManager({
    targetUrl: "http://127.0.0.1:3789",
    resolveExecutable: async () => null,
    spawnProcess: () => { spawnCalls += 1; }
  });

  await assert.rejects(manager.start(), (error) => {
    assert.equal(error.code, "PUBLIC_TUNNEL_DEPENDENCY_MISSING");
    assert.equal(error.statusCode, 503);
    return true;
  });
  assert.equal(spawnCalls, 0);
  assert.deepEqual(manager.status(), {
    provider: "cloudflare",
    dependency: "cloudflared",
    available: false,
    starting: false,
    running: false,
    publicUrl: null,
    startedAt: null,
    lastError: "cloudflared is not installed or is not available on PATH"
  });
});

test("starts, exposes, host-matches, and stops a Quick Tunnel process", async () => {
  const child = createFakeChild();
  let spawnArgs = null;
  const manager = createPublicTunnelManager({
    targetUrl: "http://127.0.0.1:3789",
    resolveExecutable: async () => "/usr/local/bin/cloudflared",
    spawnProcess: (...args) => {
      spawnArgs = args;
      queueMicrotask(() => child.stderr.write("INF https://gentle-lake.trycloudflare.com\n"));
      return child;
    },
    now: () => "2026-07-15T00:00:00.000Z"
  });

  const status = await manager.start();
  assert.equal(spawnArgs[0], "/usr/local/bin/cloudflared");
  assert.deepEqual(spawnArgs[1], ["tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:3789"]);
  assert.equal(status.running, true);
  assert.equal(status.publicUrl, "https://gentle-lake.trycloudflare.com");
  assert.equal(status.startedAt, "2026-07-15T00:00:00.000Z");
  assert.equal(manager.isRequestHost("gentle-lake.trycloudflare.com"), true);

  await manager.stop();
  assert.deepEqual(child.killSignals, ["SIGTERM"]);
  assert.equal(manager.status().running, false);
  assert.equal(manager.status().lastError, null);
});

test("surfaces a bounded cloudflared diagnostic when it exits before the URL", async () => {
  const child = createFakeChild();
  const manager = createPublicTunnelManager({
    targetUrl: "http://localhost:3789",
    resolveExecutable: async () => "/usr/bin/cloudflared",
    spawnProcess: () => {
      queueMicrotask(() => {
        child.stderr.write(`ERR ${"x".repeat(700)}\n`);
        child.exitCode = 1;
        child.emit("exit", 1, null);
      });
      return child;
    }
  });

  await assert.rejects(manager.start(), (error) => {
    assert.equal(error.code, "PUBLIC_TUNNEL_PROCESS_EXITED");
    return true;
  });
  assert.equal(manager.status().running, false);
  assert.equal(manager.status().lastError.length, 500);
});

function createFakeChild() {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.exitCode = null;
  child.signalCode = null;
  child.killSignals = [];
  child.kill = (signal) => {
    child.killSignals.push(signal);
    child.signalCode = signal;
    queueMicrotask(() => child.emit("exit", null, signal));
    return true;
  };
  return child;
}
