import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWebQueryVariants,
  buildWebSearchProviderPlan,
  createWebSearch,
  isSafePublicHttpUrl,
  parseBaiduResults,
  parseBingResults,
  parseDuckDuckGoResults,
  parseSo360Results,
  parseSogouResults,
  readResponseText
} from "../src/web-search.js";

test("builds deterministic provider plans and query variants", () => {
  assert.deepEqual(buildWebSearchProviderPlan({
    providerConfig: "ddg, baidu, 360, unknown, baidu",
    provider: "bing",
    hasTavilyKey: false
  }), ["bing", "duckduckgo", "baidu", "so360"]);
  assert.deepEqual(buildWebSearchProviderPlan({
    preset: "global",
    provider: "auto",
    hasTavilyKey: true
  }), ["tavily", "bing", "duckduckgo", "baidu", "so360"]);
  assert.deepEqual(buildWebQueryVariants("帮我查一下 某游戏最新版本？"), [
    "帮我查一下 某游戏最新版本？",
    "某游戏最新版本？",
    "某游戏最新版本",
    "某游戏最新版本 最新",
    "某游戏最新版本 攻略"
  ]);
});

test("parses supported search engine result layouts", () => {
  const ddg = parseDuckDuckGoResults(`
    <div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com">Example &amp; Docs</a>
    <a class="result__snippet">Useful <b>summary</b></a></div>
  `);
  assert.deepEqual(ddg[0], { title: "Example & Docs", url: "https://example.com", snippet: "Useful summary" });

  const bing = parseBingResults(`<li class="b_algo"><h2><a href="https://example.com/b">Bing title</a></h2><p>Bing text</p></li>`);
  assert.deepEqual(bing[0], { title: "Bing title", url: "https://example.com/b", snippet: "Bing text" });

  const baidu = parseBaiduResults(`<h3><a href="https://example.com/a">百度结果</a></h3><!--s-text-->百度摘要<!--/s-text-->`);
  assert.deepEqual(baidu[0], { title: "百度结果", url: "https://example.com/a", snippet: "百度摘要", source: "baidu" });

  const so360 = parseSo360Results(`<h3><a href="https://redirect.example" data-mdurl="https://example.com/360">360 结果</a></h3><p class="res-desc">360 摘要</p>`);
  assert.deepEqual(so360[0], { title: "360 结果", url: "https://example.com/360", snippet: "360 摘要", source: "so360" });

  const sogou = parseSogouResults(`<div class="vrwrap"><h3><a href="/link?id=1">搜狗结果</a></h3><p class="str_info">搜狗摘要</p></div>`);
  assert.deepEqual(sogou[0], { title: "搜狗结果", url: "https://www.sogou.com/link?id=1", snippet: "搜狗摘要" });
});

test("rejects private enrichment targets and oversized responses", async () => {
  for (const url of [
    "http://localhost/admin",
    "http://127.0.0.1:3000/get_login_info",
    "http://10.0.0.1/",
    "http://172.16.0.1/",
    "http://192.168.1.1/",
    "http://[::1]/",
    "http://[::ffff:7f00:1]/",
    "http://[::ffff:10.0.0.1]/",
    "file:///etc/passwd",
    "https://user:pass@example.com/"
  ]) {
    assert.equal(isSafePublicHttpUrl(url), false, url);
  }
  assert.equal(isSafePublicHttpUrl("https://example.com/docs"), true);
  assert.equal(isSafePublicHttpUrl("https://1.1.1.1/"), true);

  await assert.rejects(
    readResponseText(new Response("12345"), { maxBytes: 4 }),
    /response body is too large/
  );
});

test("search updates diagnostics and never enriches a private result URL", async () => {
  const maintenance = {};
  const calls = [];
  const webSearch = createWebSearch({
    maintenance,
    provider: "tavily",
    providerConfig: "tavily",
    tavilyApiKey: "test-key",
    lookupHost: async () => [{ address: "10.0.0.20", family: 4 }],
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      return new Response(JSON.stringify({
        results: [
          { title: "unsafe DNS target", url: "https://internal.example/private", content: "" },
          { title: "unsafe mapped target", url: "http://[::ffff:7f00:1]/private", content: "" }
        ]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });

  const results = await webSearch.search("test query", { traceId: "trace-1" });
  assert.equal(results.length, 2);
  assert.deepEqual(results.map((result) => result.snippet), ["", ""]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.authorization, "Bearer test-key");
  assert.equal(maintenance.lastOk, true);
  assert.equal(maintenance.effectiveProvider, "tavily");
  assert.equal(maintenance.lastAttempts[0].resultCount, 2);
});

test("snippet enrichment validates every redirect hop", async () => {
  const maintenance = {};
  const calls = [];
  const webSearch = createWebSearch({
    maintenance,
    provider: "tavily",
    providerConfig: "tavily",
    tavilyApiKey: "test-key",
    lookupHost: async () => [{ address: "93.184.216.34", family: 4 }],
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (calls.length === 1) {
        return new Response(JSON.stringify({
          results: [{ title: "redirect", url: "https://example.com/start", content: "" }]
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/internal" }
      });
    }
  });

  const results = await webSearch.search("redirect test");
  assert.equal(results[0].snippet, "");
  assert.deepEqual(calls, ["https://api.tavily.com/search", "https://example.com/start"]);
});
