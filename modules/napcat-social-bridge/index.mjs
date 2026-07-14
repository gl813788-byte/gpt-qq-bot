export async function plugin_init(ctx) {
  ctx.router.getNoAuth("/health", (req, res) => {
    if (!isLoopbackRequest(req)) return res.status(403).json({ ok: false, error: "loopback_only" });
    res.json({ ok: true, status: "ok", plugin: ctx.pluginName });
  });

  ctx.router.postNoAuth("/add-friend", async (req, res) => {
    if (!isLoopbackRequest(req)) return res.status(403).json({ ok: false, error: "loopback_only" });
    const targetId = normalizeQqId(req.body?.target_id);
    const message = String(req.body?.message || "").trim().slice(0, 120);
    if (!targetId) return res.status(400).json({ ok: false, error: "invalid_target_id" });

    try {
      const uid = await ctx.core.apis.UserApi.getUidByUinV2(targetId);
      if (uid && await ctx.core.apis.FriendApi.isBuddy(uid)) {
        return res.json({ ok: true, status: "already_friend", target_id: targetId });
      }
      const buddyService = ctx.core.context.session.getBuddyService();
      if (!buddyService || typeof buddyService.reqToAddFriends !== "function") {
        return res.status(501).json({ ok: false, error: "reqToAddFriends_unavailable" });
      }
      // QQNT's current native wrapper accepts a single ReqToFriend object. Older
      // NapCat declarations still describe this as (uin, message), so keep the
      // object construction here instead of trusting the stale TypeScript type.
      const request = {
        buddyUin: Number(targetId),
        buddyUid: String(uid || ""),
        phoneNumber: "",
        addFriendSetting: 0,
        answer: "",
        remark: "",
        defaultCatgory: 0,
        verifyInfo: message,
        sourceID: 0,
        sourceSubID: 0,
        qzoneNotWatch: false,
        qzoneNotWatched: false,
        onlyChat: false,
        randStr: "",
        friendPermissionList: []
      };
      await Promise.resolve(buddyService.reqToAddFriends(request));
      ctx.logger.info("Submitted QQ friend request", { targetId });
      return res.json({ ok: true, status: "submitted", target_id: targetId });
    } catch (error) {
      ctx.logger.error("Unable to submit QQ friend request", error);
      return res.status(500).json({ ok: false, error: String(error?.message || error || "unknown_error") });
    }
  });

  ctx.router.postNoAuth("/join-group", (req, res) => {
    if (!isLoopbackRequest(req)) return res.status(403).json({ ok: false, error: "loopback_only" });
    res.status(501).json({ ok: false, error: "join_group_not_supported" });
  });

  ctx.logger.info("Codex QQ social bridge initialized");
}

export async function plugin_cleanup() {
}

function isLoopbackRequest(req) {
  const address = String(req?.raw?.socket?.remoteAddress || req?.raw?.connection?.remoteAddress || "").toLowerCase();
  if (address === "::1" || address === "0:0:0:0:0:0:0:1") return true;
  const ipv4 = address.startsWith("::ffff:") ? address.slice(7) : address;
  return ipv4 === "127.0.0.1" || ipv4.startsWith("127.");
}

function normalizeQqId(value) {
  const id = String(value ?? "").trim();
  return /^[1-9][0-9]{4,12}$/.test(id) ? id : "";
}
