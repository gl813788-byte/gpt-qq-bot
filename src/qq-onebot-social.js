export function buildOneBotPokeAttempts({ groupId, userId } = {}) {
  const targetId = normalizeQqId(userId);
  const normalizedGroupId = normalizeQqId(groupId);
  if (!targetId) return [];
  if (normalizedGroupId) {
    const payload = {
      group_id: normalizedGroupId,
      user_id: targetId,
      target_id: targetId
    };
    return ["send_poke", "group_poke"].map((endpoint) => ({ endpoint, payload }));
  }
  const payload = { user_id: targetId, target_id: targetId };
  return ["send_poke", "friend_poke"].map((endpoint) => ({ endpoint, payload }));
}

export function shouldImplicitlyPokeBack(reply, event = {}) {
  if (!isPokeEvent(event)) return false;
  const visible = String(reply || "")
    .replace(/\[\[qq_(?:command|memory|sticker|image|file):[^\n]*?\]\]/g, "")
    .replace(/\[\[qq_done\]\]/g, "")
    .trim();
  if (!visible || visible.length > 80) return false;
  if (/(?:没有|没想|不想|不要|别).{0,8}(?:拍|戳|回拍|回戳)/i.test(visible)) return false;
  return /(?:拍|戳)(?:回去|回你|回他|回她|回ta|回一下)|(?:回拍|回戳)/i.test(visible);
}

export function summarizePokeFailures(results = []) {
  return (Array.isArray(results) ? results : [])
    .filter((result) => result && !result.ok)
    .map((result) => {
      const detail = result.error || result.body?.message || result.body?.wording || `HTTP ${result.status || "未知"}`;
      return `${result.endpoint || "unknown"}: ${detail}`;
    })
    .join("；");
}

function isPokeEvent(event) {
  return event?.type === "group_poke" || event?.type === "private_poke" || Boolean(event?.poke);
}

function normalizeQqId(value) {
  const id = String(value ?? "").trim();
  return /^\d{4,20}$/.test(id) ? id : "";
}
