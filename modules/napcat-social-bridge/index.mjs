export async function plugin_init(ctx) {
  ctx.router.getNoAuth("/health", (req, res) => {
    if (!isLoopbackRequest(req)) return res.status(403).json({ ok: false, error: "loopback_only" });
    res.json({
      ok: true,
      status: "ok",
      plugin: ctx.pluginName,
      version: 2,
      capabilities: ["friend-verification", "group-join-verification"],
      native: {
        reqToAddFriendsArity: methodArity(ctx.core.context.session.getBuddyService(), "reqToAddFriends"),
        reqToJoinGroupArity: methodArity(ctx.core.context.session.getGroupService(), "reqToJoinGroup"),
        joinGroupArity: methodArity(ctx.core.context.session.getGroupService(), "joinGroup")
      }
    });
  });

  ctx.router.postNoAuth("/add-friend", async (req, res) => {
    if (!isLoopbackRequest(req)) return res.status(403).json({ ok: false, error: "loopback_only" });
    const targetId = normalizeQqId(req.body?.target_id);
    const message = String(req.body?.message || "").trim().slice(0, 120);
    const answer = String(req.body?.answer || "").trim().slice(0, 120);
    const remark = String(req.body?.remark || "").trim().slice(0, 60);
    const requestedSetting = normalizeOptionalInteger(req.body?.add_friend_setting, 0, 99);
    const categoryId = normalizeOptionalInteger(req.body?.category_id, 0, 999) ?? 0;
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
      const requirements = await readFriendRequirements(buddyService, targetId, ctx);
      const addFriendSetting = requirements.setting ?? requestedSetting ?? (answer ? 2 : 0);
      if (addFriendSetting === 99) {
        return res.status(409).json({
          ok: false,
          error: "friend_requests_disabled",
          verification_mode: friendVerificationMode(addFriendSetting)
        });
      }
      if ((addFriendSetting === 2 || addFriendSetting === 3) && !answer) {
        return res.status(409).json({
          ok: false,
          error: "verification_required",
          questions: requirements.questions,
          verification_mode: friendVerificationMode(addFriendSetting),
          requires_message: addFriendSetting === 3
        });
      }
      if (addFriendSetting === 1 && !message) {
        return res.status(409).json({
          ok: false,
          error: "verification_message_required",
          verification_mode: friendVerificationMode(addFriendSetting)
        });
      }
      // QQNT's current native wrapper accepts a single ReqToFriend object. Older
      // NapCat declarations still describe this as (uin, message), so keep the
      // object construction here instead of trusting the stale TypeScript type.
      const request = {
        buddyUin: Number(targetId),
        buddyUid: String(uid || ""),
        phoneNumber: "",
        addFriendSetting,
        answer,
        remark,
        defaultCatgory: categoryId,
        verifyInfo: message,
        sourceID: 0,
        sourceSubID: 0,
        qzoneNotWatch: false,
        qzoneNotWatched: false,
        onlyChat: false,
        randStr: "",
        friendPermissionList: []
      };
      const result = await Promise.resolve(buddyService.reqToAddFriends(request));
      const failure = nativeFailure(result);
      if (failure) return sendNativeFailure(res, failure);
      const pendingApproval = addFriendSetting === 1 || addFriendSetting === 3;
      ctx.logger.info("Submitted QQ friend request", { targetId, addFriendSetting, pendingApproval });
      return res.json({
        ok: true,
        status: pendingApproval ? "pending_approval" : "submitted",
        target_id: targetId,
        verification_mode: friendVerificationMode(addFriendSetting),
        questions: requirements.questions
      });
    } catch (error) {
      ctx.logger.error("Unable to submit QQ friend request", error);
      return sendCaughtFailure(res, error);
    }
  });

  ctx.router.postNoAuth("/join-group", async (req, res) => {
    if (!isLoopbackRequest(req)) return res.status(403).json({ ok: false, error: "loopback_only" });
    const targetId = normalizeQqId(req.body?.target_id);
    const answer = String(req.body?.answer || req.body?.message || "").trim().slice(0, 300);
    if (!targetId) return res.status(400).json({ ok: false, error: "invalid_target_id" });

    try {
      const groupApi = ctx.core.apis.GroupApi;
      const groups = typeof groupApi?.getGroups === "function"
        ? await Promise.resolve(groupApi.getGroups(false)).catch(() => [])
        : [];
      if (Array.isArray(groups) && groups.some((group) => String(group?.groupCode || group?.group_id || "") === targetId)) {
        return res.json({ ok: true, status: "already_member", target_id: targetId });
      }
      if (!groupApi || typeof groupApi.searchGroup !== "function") {
        return res.status(501).json({ ok: false, error: "group_search_unavailable" });
      }
      const searchResult = await Promise.resolve(groupApi.searchGroup(targetId));
      const groupInfo = unwrapGroupInfo(searchResult, targetId);
      if (!groupInfo) return res.status(404).json({ ok: false, error: "group_not_found" });

      const groupOption = normalizeOptionalInteger(groupInfo.groupOption, 0, 99) ?? 0;
      const question = String(groupInfo.groupQuestion || "").trim().slice(0, 300);
      const memberNum = Number(groupInfo.memberNum);
      const maxMemberNum = Number(groupInfo.maxMemberNum);
      if (Number.isFinite(memberNum) && Number.isFinite(maxMemberNum) && maxMemberNum > 0 && memberNum >= maxMemberNum) {
        return res.status(409).json({ ok: false, error: "group_full", member_num: memberNum, max_member_num: maxMemberNum });
      }
      if (groupOption === 3) {
        return res.status(409).json({ ok: false, error: "group_join_disabled", group_option: groupOption, question });
      }
      if ((groupOption === 4 || groupOption === 5) && !answer) {
        return res.status(409).json({
          ok: false,
          error: "answer_required",
          group_option: groupOption,
          question,
          verification_mode: groupVerificationMode(groupOption)
        });
      }

      const groupService = ctx.core.context.session.getGroupService();
      if (!groupService) return res.status(501).json({ ok: false, error: "group_service_unavailable" });
      const joinRequest = {
        groupCode: Number(targetId),
        sourceId: 3,
        sourceSubId: 0,
        applyMsg: answer,
        auth: String(groupInfo.joinGroupAuth || ""),
        token: "",
        noVerifyAuth: ""
      };
      const result = await invokeGroupJoin(groupService, joinRequest, { requiresApproval: groupOption === 2 || groupOption === 5 });
      const failure = nativeFailure(result);
      if (failure) return sendNativeFailure(res, failure);
      const pendingApproval = groupOption === 2 || groupOption === 5;
      ctx.logger.info("Submitted QQ group join request", { targetId, groupOption, pendingApproval });
      return res.json({
        ok: true,
        status: pendingApproval ? "pending_approval" : "submitted",
        target_id: targetId,
        group_name: String(groupInfo.groupName || ""),
        group_option: groupOption,
        question,
        verification_mode: groupVerificationMode(groupOption)
      });
    } catch (error) {
      ctx.logger.error("Unable to submit QQ group join request", error);
      return sendCaughtFailure(res, error);
    }
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

async function readFriendRequirements(buddyService, targetId, ctx) {
  const attempts = [
    ["getTargetBuddySetting", [Number(targetId)]],
    ["getTargetBuddySettingByType", [Number(targetId), 0]]
  ];
  for (const [method, args] of attempts) {
    if (typeof buddyService?.[method] !== "function") continue;
    try {
      const result = await Promise.resolve(buddyService[method](...args));
      const candidate = result?.data || result?.setting || result;
      const setting = normalizeOptionalInteger(candidate?.addFriendSetting ?? candidate?.setting, 0, 99);
      if (setting !== undefined) {
        return {
          setting,
          questions: normalizeStringList(candidate?.question || candidate?.questions, 5, 120)
        };
      }
    } catch (error) {
      ctx.logger.info("Unable to inspect QQ friend verification setting", { targetId, method, error: String(error?.message || error) });
    }
  }
  return { setting: undefined, questions: [] };
}

function unwrapGroupInfo(value, targetId) {
  const candidates = [
    value?.searchGroupInfo,
    value?.data?.searchGroupInfo,
    value?.data,
    value
  ];
  return candidates.find((item) => item
    && typeof item === "object"
    && (item.groupCode != null || item.group_id != null || item.groupOption != null)
    && String(item.groupCode || item.group_id || targetId) === targetId) || null;
}

async function invokeGroupJoin(groupService, request, { requiresApproval }) {
  if (typeof groupService.reqToJoinGroup === "function") {
    return groupService.reqToJoinGroup.length >= 2
      ? Promise.resolve(groupService.reqToJoinGroup(String(request.groupCode), request))
      : Promise.resolve(groupService.reqToJoinGroup(request));
  }
  if (!requiresApproval && typeof groupService.joinGroup === "function") {
    return Promise.resolve(groupService.joinGroup(request));
  }
  const error = new Error("reqToJoinGroup_unavailable");
  error.code = "unsupported";
  throw error;
}

function nativeFailure(result) {
  if (result == null) return null;
  const code = firstFiniteNumber(result.result, result.code, result.retCode, result.errCode, result.errorCode);
  if (code == null || code === 0) return null;
  return {
    code,
    message: String(result.errMsg || result.errorString || result.message || result.wording || `QQ native error ${code}`)
  };
}

function sendNativeFailure(res, failure) {
  const riskControl = isRiskControlError(failure.message, failure.code);
  return res.status(riskControl ? 409 : 502).json({
    ok: false,
    error: riskControl ? "risk_control_required" : failure.message,
    native_code: failure.code,
    native_message: failure.message
  });
}

function sendCaughtFailure(res, error) {
  const message = String(error?.message || error || "unknown_error");
  if (message === "reqToJoinGroup_unavailable") return res.status(501).json({ ok: false, error: message });
  if (isRiskControlError(message)) return res.status(409).json({ ok: false, error: "risk_control_required", native_message: message });
  return res.status(500).json({ ok: false, error: message });
}

function isRiskControlError(message, code) {
  return /captcha|risk|security|safe|verify code|风控|安全验证|验证码|频繁/i.test(String(message || ""))
    || new Set([40, 120, 140, 210, 22009]).has(Number(code));
}

function friendVerificationMode(setting) {
  return ({
    0: "无需验证",
    1: "验证信息后审核",
    2: "正确答案",
    3: "回答问题后审核",
    99: "禁止添加"
  })[setting] || `未知验证方式 ${setting}`;
}

function groupVerificationMode(option) {
  return ({
    0: "未知群验证方式",
    1: "无需验证",
    2: "管理员审核",
    3: "禁止加入",
    4: "正确答案",
    5: "回答问题后审核"
  })[option] || `未知群验证方式 ${option}`;
}

function normalizeStringList(value, limit, maxLength) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.map((item) => String(item || "").trim().slice(0, maxLength)).filter(Boolean).slice(0, limit);
}

function normalizeOptionalInteger(value, min, max) {
  if (value == null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return undefined;
  return number;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function methodArity(target, method) {
  return typeof target?.[method] === "function" ? target[method].length : null;
}
