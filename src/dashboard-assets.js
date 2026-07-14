import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const assetRoutes = new Map([
  ["/", { fileName: "client.html", contentType: "text/html; charset=utf-8" }],
  ["/dashboard", { fileName: "client.html", contentType: "text/html; charset=utf-8" }],
  ["/client.css", { fileName: "client.css", contentType: "text/css; charset=utf-8" }],
  ["/client.js", { fileName: "client.js", contentType: "text/javascript; charset=utf-8" }]
]);

const securityHeaders = {
  "cache-control": "no-cache",
  "content-security-policy": "default-src 'self'; base-uri 'none'; connect-src 'self' http://127.0.0.1:* http://localhost:*; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'",
  "cross-origin-resource-policy": "same-origin",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY"
};

export function createDashboardAssetHandler({ directory, loadAsset = readFile } = {}) {
  if (!directory) throw new Error("Dashboard asset directory is required");
  const cache = new Map();

  async function getAsset(route) {
    if (cache.has(route.fileName)) return cache.get(route.fileName);
    const body = await loadAsset(join(directory, route.fileName));
    const asset = {
      body,
      etag: `"${createHash("sha256").update(body).digest("base64url")}"`
    };
    cache.set(route.fileName, asset);
    return asset;
  }

  return async function handleDashboardAsset(req, res) {
    if (!req || !res || !["GET", "HEAD"].includes(req.method)) return false;
    const pathname = new URL(req.url || "/", "http://localhost").pathname;
    const route = assetRoutes.get(pathname);
    if (!route) return false;

    const asset = await getAsset(route);
    for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value);
    res.setHeader("content-type", route.contentType);
    res.setHeader("etag", asset.etag);
    res.setHeader("vary", "accept-encoding");

    if (req.headers?.["if-none-match"] === asset.etag) {
      res.writeHead(304);
      res.end();
      return true;
    }

    res.setHeader("content-length", asset.body.length);
    res.writeHead(200);
    res.end(req.method === "HEAD" ? undefined : asset.body);
    return true;
  };
}

export const dashboardAssetRoutes = Object.freeze([...assetRoutes.keys()]);
