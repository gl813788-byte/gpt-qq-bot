const qzoneReadEndpoint = "https://user.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msglist_v6";
const qzoneWriteBase = "https://user.qzone.qq.com/proxy/domain/taotao.qzone.qq.com/cgi-bin";

export function createQqZoneClient({ callOneBotAction, fetchImpl = fetch, timeoutMs = 12000 }) {
  if (typeof callOneBotAction !== "function") throw new TypeError("callOneBotAction is required");

  async function credentials() {
    const result = await callOneBotAction("get_credentials", { domain: "qzone.qq.com" });
    const data = result?.body?.data || {};
    const cookies = String(data.cookies || "");
    const token = Number(data.token);
    const loginUin = (cookies.match(/(?:^|;\s*)uin=o0*([0-9]+)/) || [])[1] || "";
    if (!result?.ok || !cookies || !Number.isFinite(token) || !loginUin) {
      throw new Error(result?.error || "NapCat 未返回可用的 QQ 空间登录凭据");
    }
    return { cookies, token, loginUin };
  }

  async function list({ uin, count = 10 } = {}) {
    const auth = await credentials();
    const targetUin = normalizeQqId(uin) || auth.loginUin;
    const url = new URL(qzoneReadEndpoint);
    const callback = "_codexQzoneCallback";
    appendParams(url.searchParams, {
      uin: targetUin,
      ftype: 0,
      sort: 0,
      pos: 0,
      num: Math.max(1, Math.min(20, Number(count) || 10)),
      replynum: 0,
      g_tk: auth.token,
      callback,
      code_version: 1,
      format: "jsonp",
      need_private_comment: 1
    });
    const body = await qzoneFetch(url, { auth, method: "GET", callback });
    if (Number(body.code) !== 0) throw new Error(body.message || `QQ 空间返回错误 ${body.code}`);
    const items = Array.isArray(body.msglist) ? body.msglist : [];
    return items.map(normalizeQzoneMood).filter(Boolean);
  }

  async function publish(content) {
    const text = normalizeContent(content, 2000);
    if (!text) throw new Error("动态内容不能为空");
    const auth = await credentials();
    const url = new URL(`${qzoneWriteBase}/emotion_cgi_publish_v6`);
    url.searchParams.set("g_tk", String(auth.token));
    const form = new URLSearchParams();
    appendParams(form, {
      syn_tweet_verson: 1,
      paramstr: 1,
      pic_template: "",
      richtype: "",
      richval: "",
      special_url: "",
      subrichtype: "",
      con: text,
      feedversion: 1,
      ver: 1,
      ugc_right: 1,
      to_sign: 0,
      hostuin: auth.loginUin,
      code_version: 1,
      format: "fs"
    });
    const body = await qzoneFetch(url, { auth, method: "POST", form });
    assertQzoneWriteSuccess(body);
    return {
      tid: String(body.tid || body.topicId || body.data?.tid || ""),
      message: String(body.message || body.msg || "发表成功")
    };
  }

  async function comment({ uin, tid, content }) {
    const text = normalizeContent(content, 500);
    const targetUin = normalizeQqId(uin);
    const targetTid = String(tid || "").trim();
    if (!targetUin || !targetTid) throw new Error("评论动态需要目标 QQ 和动态 tid");
    if (!text) throw new Error("评论内容不能为空");
    const auth = await credentials();
    const url = new URL(`${qzoneWriteBase}/emotion_cgi_re_feeds`);
    url.searchParams.set("g_tk", String(auth.token));
    const form = new URLSearchParams();
    appendParams(form, {
      topicId: `${targetUin}_${targetTid}`,
      feedsType: 100,
      hostUin: targetUin,
      platformid: 52,
      uin: auth.loginUin,
      format: "fs",
      ref: "feeds",
      content: text,
      feedversion: 1,
      paramstr: 1
    });
    const body = await qzoneFetch(url, { auth, method: "POST", form });
    assertQzoneWriteSuccess(body);
    return { message: String(body.message || body.msg || "评论成功") };
  }

  async function qzoneFetch(url, { auth, method, form, callback = "" }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method,
        signal: controller.signal,
        headers: {
          cookie: auth.cookies,
          referer: `https://user.qzone.qq.com/${auth.loginUin}/main`,
          "user-agent": "Mozilla/5.0 (Codex QQ Bot)",
          ...(form ? { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" } : {})
        },
        body: form?.toString()
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`QQ 空间 HTTP ${response.status}`);
      return parseQzoneResponse(text, callback);
    } finally {
      clearTimeout(timer);
    }
  }

  return { list, publish, comment };
}

export function parseQzoneResponse(text, callback = "") {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("QQ 空间返回了空响应");
  const candidates = [raw];
  if (callback && raw.startsWith(`${callback}(`)) candidates.push(raw.slice(callback.length + 1).replace(/\);?\s*$/, ""));
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(raw.slice(firstBrace, lastBrace + 1));
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next wrapper format used by QZone's form sender.
    }
  }
  throw new Error("无法解析 QQ 空间响应");
}

function normalizeQzoneMood(item) {
  if (!item || typeof item !== "object" || !item.tid) return null;
  const content = normalizeContent(item.content || item.con || item.summary || "", 1200);
  return {
    tid: String(item.tid),
    uin: String(item.uin || ""),
    createdTime: Number(item.created_time || 0),
    content,
    commentCount: Number(item.cmtnum || 0),
    forwardCount: Number(item.fwdnum || 0),
    pictureCount: Number(item.pictotal || (Array.isArray(item.pic) ? item.pic.length : 0) || 0)
  };
}

function normalizeContent(value, maxLength) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .trim()
    .slice(0, maxLength);
}

function normalizeQqId(value) {
  const id = String(value || "").trim();
  return /^[1-9][0-9]{4,12}$/.test(id) ? id : "";
}

function appendParams(target, values) {
  for (const [key, value] of Object.entries(values)) target.set(key, String(value));
}

function assertQzoneWriteSuccess(body) {
  const code = body?.code ?? body?.ret ?? body?.err;
  if (code == null) throw new Error("QQ 空间响应缺少明确的操作结果码");
  if (code != null && Number(code) !== 0) {
    throw new Error(body.message || body.msg || `QQ 空间返回错误 ${code}`);
  }
}
