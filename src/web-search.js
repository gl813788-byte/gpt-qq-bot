import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { fetchWithUrlPolicy, isPrivateOrReservedAddress } from "./safe-fetch.js";

const supportedProviders = new Set(["tavily", "bing", "baidu", "so360", "sogou", "duckduckgo"]);
const defaultBrowserUserAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const defaultResponseLimitBytes = 2 * 1024 * 1024;
const defaultSnippetLimitBytes = 512 * 1024;

export function createWebSearch({
  maintenance,
  logger,
  fetchImpl = globalThis.fetch,
  lookupHost = lookup,
  timeoutMs = 12_000,
  attemptTimeoutMs = 6_500,
  provider = "auto",
  preset = "balanced",
  providerConfig = "",
  tavilyApiKey = "",
  userAgent = "Codex-Remote-Contact",
  browserUserAgent = defaultBrowserUserAgent,
  normalizeQuery = (value) => String(value || "").trim()
} = {}) {
  if (!maintenance || typeof maintenance !== "object") {
    throw new TypeError("web search maintenance state is required");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("web search fetch implementation is required");
  }

  const config = {
    timeoutMs: normalizeTimeout(timeoutMs, 12_000, 1_000, 60_000),
    attemptTimeoutMs: normalizeTimeout(attemptTimeoutMs, 6_500, 500, 30_000),
    provider: String(provider || "auto").trim().toLowerCase(),
    preset: String(preset || "balanced").trim().toLowerCase(),
    providerConfig: String(providerConfig || "").trim(),
    tavilyApiKey: String(tavilyApiKey || ""),
    userAgent: String(userAgent || "Codex-Remote-Contact"),
    browserUserAgent: String(browserUserAgent || defaultBrowserUserAgent),
    lookupHost,
    normalizeQuery
  };

  function buildProviderPlan() {
    return buildWebSearchProviderPlan({
      providerConfig: config.providerConfig,
      preset: config.preset,
      provider: config.provider,
      hasTavilyKey: Boolean(config.tavilyApiKey)
    });
  }

  function chooseProvider() {
    return chooseWebSearchProvider({
      provider: config.provider,
      hasTavilyKey: Boolean(config.tavilyApiKey)
    });
  }

  async function search(query, { traceId = "" } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    const startedAt = Date.now();
    const providerPlan = buildProviderPlan();
    maintenance.lastQuery = query;
    maintenance.lastRunAt = new Date().toISOString();
    maintenance.lastProviderErrors = [];
    maintenance.lastAttempts = [];
    maintenance.configuredProviders = providerPlan;
    maintenance.providerPreset = config.preset;
    try {
      const queryVariants = buildWebQueryVariants(query);
      if (queryVariants.length === 0) return [];
      const wikipediaResults = [];
      const webResults = [];
      const preferredProvider = providerPlan[0] || chooseProvider();
      maintenance.effectiveProvider = preferredProvider;
      logger?.info?.("QQ web lookup started", {
        query,
        preset: config.preset,
        providers: providerPlan.map(formatWebSearchProviderName),
        timeoutMs: config.timeoutMs,
        attemptTimeoutMs: config.attemptTimeoutMs
      }, "search", { traceId });

      if (preferredProvider !== "tavily" && shouldUseWikipediaForQuery(query)) {
        for (const variant of queryVariants.slice(0, 2)) {
          const hits = await searchWikipedia(variant, controller.signal).catch(() => []);
          wikipediaResults.push(...hits);
          if (wikipediaResults.length >= 2) break;
        }
      }

      await collectProviderResults(providerPlan, queryVariants, controller.signal, webResults, { traceId });
      const results = mergeSearchResults([...wikipediaResults, ...webResults]).slice(0, 5);
      const enriched = await enrichWebResults(results, controller.signal);
      maintenance.lastOk = true;
      maintenance.lastError = null;
      maintenance.lastDurationMs = Date.now() - startedAt;
      logger?.success?.("QQ web lookup succeeded", {
        query,
        provider: formatWebSearchProviderName(maintenance.effectiveProvider),
        resultCount: enriched.length,
        durationMs: maintenance.lastDurationMs
      }, "search", { traceId });
      return enriched;
    } catch (error) {
      maintenance.lastOk = false;
      maintenance.lastError = error.message;
      maintenance.lastDurationMs = Date.now() - startedAt;
      logger?.warn?.("QQ web lookup failed", {
        query,
        provider: maintenance.effectiveProvider,
        durationMs: maintenance.lastDurationMs,
        error: error.message,
        providerErrors: maintenance.lastProviderErrors
      }, "search", { traceId });
      if (error.name === "AbortError") throw new Error("search timed out");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function collectProviderResults(providers, queryVariants, signal, output, { traceId = "" } = {}) {
    if (!Array.isArray(queryVariants) || queryVariants.length === 0) return;
    const providerList = Array.isArray(providers) && providers.length > 0 ? providers : buildProviderPlan();
    const errors = [];
    for (const currentProvider of providerList) {
      const outputLengthBeforeProvider = output.length;
      let providerReturnedEmpty = false;
      let providerFailed = false;
      maintenance.effectiveProvider = currentProvider;
      for (const variant of queryVariants.slice(0, 4)) {
        const attemptStartedAt = Date.now();
        try {
          const hits = await runWebSearchAttempt(
            (attemptSignal) => searchWithProvider(currentProvider, variant, attemptSignal),
            signal,
            providerAttemptTimeoutMs(currentProvider)
          );
          recordAttempt({
            provider: currentProvider,
            query: variant,
            ok: hits.length > 0,
            resultCount: hits.length,
            durationMs: Date.now() - attemptStartedAt
          });
          logger?.debug?.("QQ web lookup provider attempt", {
            provider: formatWebSearchProviderName(currentProvider),
            rawProvider: currentProvider,
            query: variant,
            resultCount: hits.length,
            durationMs: Date.now() - attemptStartedAt,
            status: hits.length > 0 ? "found_results" : "no_results"
          }, "search", { traceId });
          if (hits.length === 0) {
            providerReturnedEmpty = true;
            continue;
          }
          output.push(...hits);
          if (output.length >= 5) return;
        } catch (error) {
          providerFailed = true;
          errors.push(`${currentProvider}: ${error.message}`);
          maintenance.lastProviderErrors = errors.slice(-8);
          recordAttempt({
            provider: currentProvider,
            query: variant,
            ok: false,
            error: error.message,
            durationMs: Date.now() - attemptStartedAt
          });
          logger?.warn?.("QQ web lookup provider failed", {
            provider: formatWebSearchProviderName(currentProvider),
            query: variant,
            durationMs: Date.now() - attemptStartedAt,
            error: error.message
          }, "search", { traceId });
          if (error.name === "AbortError") throw error;
        }
      }
      if (output.length > 0) return;
      if (output.length === outputLengthBeforeProvider && providerReturnedEmpty && !providerFailed) {
        errors.push(`${currentProvider}: no results`);
        maintenance.lastProviderErrors = errors.slice(-8);
      }
    }
    if (errors.length > 0) throw new Error(`all search providers failed (${errors.join("; ")})`);
    throw new Error("all search providers returned no results");
  }

  function recordAttempt(attempt) {
    const entry = {
      provider: formatWebSearchProviderName(attempt.provider),
      rawProvider: attempt.provider,
      query: String(attempt.query || "").slice(0, 200),
      ok: Boolean(attempt.ok),
      resultCount: Number(attempt.resultCount || 0),
      durationMs: Number(attempt.durationMs || 0),
      error: attempt.error ? String(attempt.error).slice(0, 300) : null
    };
    maintenance.lastAttempts.push(entry);
    maintenance.lastAttempts = maintenance.lastAttempts.slice(-20);
  }

  function providerAttemptTimeoutMs(currentProvider) {
    if (currentProvider === "tavily") {
      return Math.min(config.timeoutMs, Math.max(config.attemptTimeoutMs, 5_000));
    }
    return config.attemptTimeoutMs;
  }

  async function searchWithProvider(currentProvider, query, signal) {
    if (currentProvider === "tavily") return searchTavily(query, signal);
    if (currentProvider === "bing") return searchBing(query, signal);
    if (currentProvider === "baidu") return searchBaidu(query, signal);
    if (currentProvider === "so360") return searchSo360(query, signal);
    if (currentProvider === "sogou") return searchSogou(query, signal);
    return searchDuckDuckGo(query, signal);
  }

  async function searchWikipedia(query, signal) {
    const wikipediaQuery = buildWikipediaQuery(query, config.normalizeQuery);
    const titles = await searchWikipediaTitles(wikipediaQuery, signal, "zh");
    const fallbackTitles = titles.length > 0 ? [] : await searchWikipediaTitles(query, signal, "en");
    const results = [];
    for (const candidate of [...titles, ...fallbackTitles].slice(0, 2)) {
      const summary = await fetchWikipediaSummary(candidate.title, signal, candidate.lang).catch(() => null);
      if (summary?.title) results.push(summary);
    }
    return results;
  }

  async function searchWikipediaTitles(query, signal, lang) {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json&origin=*`;
    const response = await fetchImpl(url, { signal, headers: { "user-agent": config.userAgent } });
    if (!response.ok) return [];
    const data = JSON.parse(await readResponseText(response));
    return (Array.isArray(data?.[1]) ? data[1] : []).map((title) => ({ title, lang }));
  }

  async function fetchWikipediaSummary(title, signal, lang) {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const response = await fetchImpl(url, { signal, headers: { "user-agent": config.userAgent } });
    if (!response.ok) return null;
    const data = JSON.parse(await readResponseText(response));
    if (data.type === "disambiguation" && !data.extract) return null;
    return {
      title: `Wikipedia：${data.title || title}`,
      url: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      snippet: data.extract || "",
      source: "wikipedia"
    };
  }

  async function searchDuckDuckGo(query, signal) {
    const response = await fetchImpl(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      signal,
      headers: { "user-agent": config.browserUserAgent }
    });
    if (!response.ok) throw new Error(`search returned HTTP ${response.status}`);
    const html = await readResponseText(response);
    if (response.status === 202 || /anomaly|challenge-form|Please prove you are human/i.test(html)) {
      throw new Error("duckduckgo returned verification page");
    }
    return parseDuckDuckGoResults(html).slice(0, 3);
  }

  async function searchTavily(query, signal) {
    if (!config.tavilyApiKey) throw new Error("Tavily API key is not configured");
    const response = await fetchImpl("https://api.tavily.com/search", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${config.tavilyApiKey}`
      },
      body: JSON.stringify({ query, search_depth: "basic", max_results: 5, include_answer: false })
    });
    if (!response.ok) throw new Error(`tavily returned HTTP ${response.status}`);
    const data = JSON.parse(await readResponseText(response));
    return Array.isArray(data?.results)
      ? data.results.map((result) => ({
        title: String(result.title || result.url || "").trim(),
        url: String(result.url || "").trim(),
        snippet: String(result.content || result.snippet || "").trim(),
        source: "tavily"
      })).filter((result) => result.title && result.url)
      : [];
  }

  async function fetchSearchHtml(name, url, query, signal) {
    const response = await fetchImpl(`${url}${encodeURIComponent(query)}`, {
      signal,
      headers: {
        "user-agent": config.browserUserAgent,
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.7"
      }
    });
    if (!response.ok) throw new Error(`${name} returned HTTP ${response.status}`);
    return readResponseText(response);
  }

  async function searchBing(query, signal) {
    return parseBingResults(await fetchSearchHtml("bing", "https://www.bing.com/search?q=", query, signal)).slice(0, 5);
  }

  async function searchBaidu(query, signal) {
    const html = await fetchSearchHtml("baidu", "https://www.baidu.com/s?wd=", query, signal);
    if (/请输入验证码|安全验证|verify.baidu.com/i.test(html)) throw new Error("baidu returned verification page");
    return parseBaiduResults(html).slice(0, 5);
  }

  async function searchSo360(query, signal) {
    const html = await fetchSearchHtml("so360", "https://www.so.com/s?q=", query, signal);
    if (/请输入验证码|安全验证|检测到异常请求/i.test(html)) throw new Error("so360 returned verification page");
    return parseSo360Results(html).slice(0, 5);
  }

  async function searchSogou(query, signal) {
    const html = await fetchSearchHtml("sogou", "https://www.sogou.com/web?query=", query, signal);
    if (/anti\.min\.css|antispider|请输入验证码|搜狗搜索验证/i.test(html)) throw new Error("sogou returned verification page");
    return parseSogouResults(html).slice(0, 5);
  }

  async function enrichWebResults(results, signal) {
    const enriched = [];
    for (const result of results) {
      if (!result.snippet && result.source !== "wikipedia" && enriched.length < 2 && result.url) {
        enriched.push({ ...result, snippet: await fetchPageSnippet(result.url, signal).catch(() => "") });
      } else {
        enriched.push(result);
      }
    }
    return enriched;
  }

  async function fetchPageSnippet(value, parentSignal) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(3_500, config.timeoutMs));
    const abortFromParent = () => controller.abort();
    parentSignal?.addEventListener("abort", abortFromParent, { once: true });
    try {
      if (parentSignal?.aborted) return "";
      const response = await fetchWithUrlPolicy(String(value || ""), {
        signal: controller.signal,
        headers: { "user-agent": config.userAgent }
      }, {
        maxRedirects: 3,
        resolveHostname: async (hostname) => {
          const records = await config.lookupHost(hostname, { all: true, verbatim: true });
          return Array.isArray(records)
            ? records.map((record) => typeof record === "string" ? record : record?.address).filter(Boolean)
            : [];
        },
        fetchImpl
      });
      if (!response.ok) {
        await response.body?.cancel?.().catch?.(() => undefined);
        return "";
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("text/html")) {
        await response.body?.cancel?.().catch?.(() => undefined);
        return "";
      }
      return htmlToPlainText(await readResponseText(response, { maxBytes: defaultSnippetLimitBytes })).slice(0, 420);
    } finally {
      clearTimeout(timeout);
      parentSignal?.removeEventListener("abort", abortFromParent);
    }
  }

  return { search, buildProviderPlan };
}

export function chooseWebSearchProvider({ provider = "auto", hasTavilyKey = false } = {}) {
  const normalized = normalizeWebSearchProvider(provider);
  if (normalized && normalized !== "auto") return normalized;
  return hasTavilyKey ? "tavily" : "bing";
}

export function buildWebSearchProviderPlan({ providerConfig = "", preset = "balanced", provider = "auto", hasTavilyKey = false } = {}) {
  const configured = parseWebSearchProviders(providerConfig);
  const presetProviders = configured.length > 0 ? configured : webSearchPresetProviders(String(preset).toLowerCase());
  const preferred = normalizeWebSearchProvider(provider);
  const providers = preferred && preferred !== "auto"
    ? [preferred, ...presetProviders.filter((item) => item !== preferred)]
    : presetProviders;
  const normalized = [...new Set(providers.map(normalizeWebSearchProvider).filter(Boolean))];
  return hasTavilyKey ? normalized : normalized.filter((item) => item !== "tavily");
}

export function parseWebSearchProviders(value) {
  return String(value || "").split(/[,\s，、|>]+/g).map(normalizeWebSearchProvider).filter(Boolean);
}

export function webSearchPresetProviders(preset) {
  if (preset === "tavily") return ["tavily", "bing", "baidu", "so360"];
  if (preset === "china" || preset === "cn") return ["baidu", "so360", "bing", "sogou"];
  if (preset === "global") return ["tavily", "bing", "duckduckgo", "baidu", "so360"];
  if (preset === "privacy") return ["duckduckgo", "bing", "baidu", "so360"];
  return ["tavily", "bing", "baidu", "so360", "sogou", "duckduckgo"];
}

export function normalizeWebSearchProvider(provider) {
  const value = String(provider || "").trim().toLowerCase();
  if (!value || value === "auto") return value || "";
  if (value === "ddg") return "duckduckgo";
  if (value === "360" || value === "so" || value === "so.com") return "so360";
  return supportedProviders.has(value) ? value : "";
}

export function formatWebSearchProviderName(provider) {
  return {
    tavily: "Tavily",
    bing: "Bing",
    baidu: "Baidu",
    so360: "360 Search",
    sogou: "Sogou",
    duckduckgo: "DuckDuckGo"
  }[provider] || String(provider || "unknown");
}

export async function runWebSearchAttempt(fn, parentSignal, timeoutMs) {
  if (parentSignal?.aborted) throw createAbortError("search timed out");
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, normalizeTimeout(timeoutMs, 6_500, 1, 60_000));
  const abortFromParent = () => controller.abort();
  parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  try {
    return await fn(controller.signal);
  } catch (error) {
    if (timedOut && error.name === "AbortError") throw new Error(`attempt timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

export function buildWebQueryVariants(query) {
  const raw = String(query || "").trim();
  if (!raw) return [];
  const stripped = stripSearchLeadWords(raw);
  const base = stripQuestionTail(stripped);
  const variants = [
    raw,
    stripped,
    base,
    isTimeSensitiveWebQuery(raw) ? `${base} 最新` : "",
    /(攻略|配装|打法|角色|装备|技能|流派|版本|补丁)/i.test(raw) ? `${base} 攻略` : "",
    /(是什么|什么意思|什么梗|定义|出处|来源)/i.test(raw) ? `${base} 解释` : "",
    /(谁是|是谁)/i.test(raw) ? `${base} wiki` : ""
  ];
  return [...new Set(variants.map((item) => item.trim()).filter(Boolean))].slice(0, 5);
}

export function shouldUseWikipediaForQuery(query) {
  return /(是什么意思|什么意思|啥意思|什么梗|啥梗|定义|百科|出处|来源|是什么)/i.test(String(query || ""));
}

export function stripSearchLeadWords(query) {
  return String(query || "")
    .replace(/^(查一下|搜一下|帮我查一下|帮我搜一下|网上查一下|网上搜一下|给我查一下|给我搜一下|你查一下|你搜一下)\s*/i, "")
    .trim();
}

export function stripQuestionTail(query) {
  return String(query || "")
    .replace(/[？?。！!，,：:]+$/g, "")
    .replace(/(是什么意思|什么意思|啥意思|什么梗|啥梗|是什么梗|什么定义|的定义是什么|定义是什么|是什么东西|是什么|是谁|谁是|出处是什么|来源是什么|最近怎么样|最新消息)$/i, "")
    .trim() || String(query || "").trim();
}

export function isTimeSensitiveWebQuery(text) {
  return /(最近|最新|现在|今天|本周|本月|版本|补丁|更新|新闻|热搜|刚出|新出的|什么时候上线|什么时候更新)/i.test(String(text || ""));
}

export function buildWikipediaQuery(query, normalizeQuery = (value) => String(value || "").trim()) {
  return normalizeQuery(query)
    .replace(/[？?。！!，,：:]+$/g, "")
    .trim()
    .replace(/^(查一下|搜一下|百科一下|百科|网上查一下|帮我查一下)\s*/, "")
    .replace(/^谁是\s*/, "")
    .replace(/(是什么意思|什么意思|啥意思|什么梗|啥梗|是什么梗|什么定义|的定义是什么|定义是什么|是什么东西|是什么|是谁|谁是|出处是什么|来源是什么|最近怎么样|最新消息)$/i, "")
    .trim() || String(query || "").trim();
}

export function mergeSearchResults(results) {
  const seen = new Set();
  return (Array.isArray(results) ? results : []).filter((result) => {
    const key = result?.url || result?.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isSafePublicHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return false;
    if (isIP(hostname)) return !isPrivateOrReservedAddress(hostname);
    return true;
  } catch {
    return false;
  }
}

export async function readResponseText(response, { maxBytes = defaultResponseLimitBytes } = {}) {
  const limit = normalizeTimeout(maxBytes, defaultResponseLimitBytes, 1, 16 * 1024 * 1024);
  const declaredLength = Number(response?.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > limit) throw new Error("response body is too large");
  if (!response?.body || typeof response.body[Symbol.asyncIterator] !== "function") {
    const text = await response.text();
    if (Buffer.byteLength(text) > limit) throw new Error("response body is too large");
    return text;
  }
  const chunks = [];
  let received = 0;
  for await (const chunk of response.body) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buffer.length;
    if (received > limit) {
      await response.body.cancel?.().catch?.(() => undefined);
      throw new Error("response body is too large");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function htmlToPlainText(html) {
  return cleanHtml(String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " "));
}

export function parseDuckDuckGoResults(html) {
  return String(html || "")
    .split(/<div class="result(?: result--ad)?/g)
    .map((block) => {
      const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (!titleMatch) return null;
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/);
      return {
        title: cleanHtml(titleMatch[2]),
        url: normalizeDuckDuckGoUrl(htmlDecode(titleMatch[1])),
        snippet: snippetMatch ? cleanHtml(snippetMatch[1]) : ""
      };
    })
    .filter((result) => result?.title)
    .filter(uniqueResultUrl);
}

export function parseBingResults(html) {
  return String(html || "")
    .split(/<li class="b_algo"/g)
    .map((block) => {
      const titleMatch = block.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i);
      if (!titleMatch) return null;
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      return { title: cleanHtml(titleMatch[2]), url: htmlDecode(titleMatch[1]), snippet: snippetMatch ? cleanHtml(snippetMatch[1]) : "" };
    })
    .filter((result) => result?.title && result.url)
    .filter(uniqueResultUrl);
}

export function parseBaiduResults(html) {
  return parseH3Results(html, "baidu", (linkMatch, block) => ({
    url: htmlDecode(linkMatch[1]),
    snippetPattern: /<!--s-text-->([\s\S]*?)<!--\/s-text-->/i,
    fallbackPattern: /<(?:div|span|p)[^>]*class="[^"]*(?:content|abstract|summary|c-abstract|paragraph)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span|p)>/i,
    block
  }));
}

export function parseSo360Results(html) {
  return parseH3Results(html, "so360", (linkMatch, block) => ({
    url: extractHtmlAttribute(linkMatch[0], "data-mdurl") || htmlDecode(linkMatch[1]),
    snippetPattern: /<(?:p|div)[^>]*class="[^"]*(?:res-desc|g-desc|mh-summary|cont|summary)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i,
    fallbackPattern: /<p[^>]*>([\s\S]*?)<\/p>/i,
    block
  }));
}

export function parseSogouResults(html) {
  return String(html || "")
    .split(/<div class="vrwrap|<div class="rb"/g)
    .map((block) => {
      const titleMatch = block.match(/<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i)
        || block.match(/<a[^>]*class="[^"]*vr-title[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!titleMatch) return null;
      const snippetMatch = block.match(/<(?:p|div)[^>]*class="[^"]*(?:str_info|ft|text-layout|content-right_8Zs40)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i)
        || block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      return { title: cleanHtml(titleMatch[2]), url: normalizeSogouUrl(htmlDecode(titleMatch[1])), snippet: snippetMatch ? cleanHtml(snippetMatch[1]) : "" };
    })
    .filter((result) => result?.title && result.url)
    .filter(uniqueResultUrl);
}

function parseH3Results(html, source, detailsFor) {
  return String(html || "")
    .split(/<h3\b/gi)
    .map((block) => {
      const h3End = block.indexOf("</h3>");
      const h3 = `<h3${block.slice(0, h3End >= 0 ? h3End : block.length)}</h3>`;
      const linkMatch = h3.match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) return null;
      const title = cleanHtml(linkMatch[2]);
      if (!isUsableSearchResultTitle(title)) return null;
      const details = detailsFor(linkMatch, block);
      const after = h3End >= 0 ? block.slice(h3End + 5, h3End + 1605) : "";
      const snippetMatch = after.match(details.snippetPattern) || after.match(details.fallbackPattern);
      return { title, url: details.url, snippet: snippetMatch ? cleanHtml(snippetMatch[1]) : "", source };
    })
    .filter((result) => result?.title && result.url)
    .filter(uniqueResultUrl);
}

function uniqueResultUrl(result, index, list) {
  return list.findIndex((item) => item.url === result.url) === index;
}

function isUsableSearchResultTitle(title) {
  return Boolean(title) && !/^(首页|其他人还搜了|相关搜索|大家还在搜|网页搜索|搜索结果)$/i.test(title);
}

function extractHtmlAttribute(html, name) {
  const match = String(html || "").match(new RegExp(`${name}="([^"]+)"`, "i"));
  return match ? htmlDecode(match[1]) : "";
}

function cleanHtml(value) {
  return htmlDecode(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function htmlDecode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)));
}

function normalizeDuckDuckGoUrl(value) {
  try {
    const url = new URL(value, "https://duckduckgo.com");
    const redirected = url.searchParams.get("uddg");
    return redirected ? decodeURIComponent(redirected) : url.href;
  } catch {
    return value;
  }
}

function normalizeSogouUrl(value) {
  try {
    return new URL(value, "https://www.sogou.com").href;
  } catch {
    return value;
  }
}

function createAbortError(message) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function normalizeTimeout(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
}
