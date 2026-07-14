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
