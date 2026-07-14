import assert from "node:assert/strict";
import test from "node:test";
import { plugin_init } from "../modules/napcat-social-bridge/index.mjs";

test("NapCat social bridge submits loopback friend requests and blocks remote callers", async () => {
  const routes = new Map();
  const submitted = [];
  const ctx = {
    pluginName: "napcat-plugin-builtin",
    router: {
      getNoAuth(path, handler) { routes.set(`GET ${path}`, handler); },
      postNoAuth(path, handler) { routes.set(`POST ${path}`, handler); }
    },
    core: {
      apis: {
        UserApi: { async getUidByUinV2(id) { return `uid:${id}`; } },
        FriendApi: { async isBuddy() { return false; } }
      },
      context: {
        session: {
          getBuddyService() {
            return { reqToAddFriends(request) { submitted.push(request); } };
          }
        }
      }
    },
    logger: { info() {}, error() {} }
  };
  await plugin_init(ctx);
  const handler = routes.get("POST /add-friend");
  assert.equal(typeof handler, "function");

  const local = responseRecorder();
  await handler({
    body: { target_id: "3596291931", message: "群里认识的" },
    raw: { socket: { remoteAddress: "::ffff:127.0.0.1" } }
  }, local);
  assert.equal(local.statusCode, 200);
  assert.equal(local.body.status, "submitted");
  assert.deepEqual(submitted, [{
    buddyUin: 3596291931,
    buddyUid: "uid:3596291931",
    phoneNumber: "",
    addFriendSetting: 0,
    answer: "",
    remark: "",
    defaultCatgory: 0,
    verifyInfo: "群里认识的",
    sourceID: 0,
    sourceSubID: 0,
    qzoneNotWatch: false,
    qzoneNotWatched: false,
    onlyChat: false,
    randStr: "",
    friendPermissionList: []
  }]);

  const remote = responseRecorder();
  await handler({
    body: { target_id: "3596291931" },
    raw: { socket: { remoteAddress: "192.168.1.9" } }
  }, remote);
  assert.equal(remote.statusCode, 403);
  assert.equal(submitted.length, 1);
});

test("NapCat social bridge requests and submits a friend verification answer", async () => {
  const routes = new Map();
  const submitted = [];
  await plugin_init(createContext(routes, {
    buddyService: {
      getTargetBuddySetting() {
        return { addFriendSetting: 2, question: ["2+2 等于几？"] };
      },
      reqToAddFriends(request) { submitted.push(request); }
    }
  }));
  const handler = routes.get("POST /add-friend");

  const missing = responseRecorder();
  await handler(localRequest({ target_id: "3596291931" }), missing);
  assert.equal(missing.statusCode, 409);
  assert.equal(missing.body.error, "verification_required");
  assert.deepEqual(missing.body.questions, ["2+2 等于几？"]);
  assert.equal(submitted.length, 0);

  const answered = responseRecorder();
  await handler(localRequest({
    target_id: "3596291931",
    answer: "4",
    remark: "测试好友",
    category_id: 3
  }), answered);
  assert.equal(answered.statusCode, 200);
  assert.equal(answered.body.status, "submitted");
  assert.equal(submitted[0].addFriendSetting, 2);
  assert.equal(submitted[0].answer, "4");
  assert.equal(submitted[0].remark, "测试好友");
  assert.equal(submitted[0].defaultCatgory, 3);
});

test("NapCat social bridge handles group questions, approval and membership states", async () => {
  const routes = new Map();
  const submitted = [];
  const groupInfo = {
    groupCode: "987654",
    groupName: "测试群",
    groupOption: 5,
    groupQuestion: "项目口令",
    joinGroupAuth: "auth-token",
    memberNum: 10,
    maxMemberNum: 200
  };
  await plugin_init(createContext(routes, {
    groupApi: {
      async getGroups() { return []; },
      async searchGroup() { return { groupCode: "987654", searchGroupInfo: groupInfo }; }
    },
    groupService: {
      reqToJoinGroup(request) {
        submitted.push(request);
        return { result: 0 };
      }
    }
  }));
  const handler = routes.get("POST /join-group");

  const missing = responseRecorder();
  await handler(localRequest({ target_id: "987654" }), missing);
  assert.equal(missing.statusCode, 409);
  assert.equal(missing.body.error, "answer_required");
  assert.equal(missing.body.question, "项目口令");

  const answered = responseRecorder();
  await handler(localRequest({ target_id: "987654", answer: "OpenAI" }), answered);
  assert.equal(answered.statusCode, 200);
  assert.equal(answered.body.status, "pending_approval");
  assert.deepEqual(submitted[0], {
    groupCode: 987654,
    sourceId: 3,
    sourceSubId: 0,
    applyMsg: "OpenAI",
    auth: "auth-token",
    token: "",
    noVerifyAuth: ""
  });
});

test("NapCat social bridge refuses disabled and full group joins", async () => {
  for (const [info, expected] of [
    [{ groupCode: "987654", groupOption: 3 }, "group_join_disabled"],
    [{ groupCode: "987654", groupOption: 2, memberNum: 200, maxMemberNum: 200 }, "group_full"]
  ]) {
    const routes = new Map();
    await plugin_init(createContext(routes, {
      groupApi: {
        async getGroups() { return []; },
        async searchGroup() { return { groupCode: "987654", searchGroupInfo: info }; }
      }
    }));
    const response = responseRecorder();
    await routes.get("POST /join-group")(localRequest({ target_id: "987654" }), response);
    assert.equal(response.statusCode, 409);
    assert.equal(response.body.error, expected);
  }
});

function createContext(routes, { buddyService, groupApi, groupService } = {}) {
  return {
    pluginName: "napcat-plugin-builtin",
    router: {
      getNoAuth(path, handler) { routes.set(`GET ${path}`, handler); },
      postNoAuth(path, handler) { routes.set(`POST ${path}`, handler); }
    },
    core: {
      apis: {
        UserApi: { async getUidByUinV2(id) { return `uid:${id}`; } },
        FriendApi: { async isBuddy() { return false; } },
        GroupApi: groupApi
      },
      context: {
        session: {
          getBuddyService() { return buddyService; },
          getGroupService() { return groupService; }
        }
      }
    },
    logger: { info() {}, error() {} }
  };
}

function localRequest(body) {
  return { body, raw: { socket: { remoteAddress: "127.0.0.1" } } };
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}
