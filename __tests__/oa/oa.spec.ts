/** OA 系统 /oa 测试（本科生账号；email-apply 为一次性接口，跳过） */
import { beforeAll, describe, expect, it } from "vitest";

import type { ApiClient } from "../client.js";
import { checkSession, expectDataObject, getAccount, loginSystem } from "../helpers.js";

const INFO_KEYS = ["id", "oaId", "name", "orgName", "orgId"];

const account = getAccount("undergraduate");

describe("oA 系统 /oa", () => {
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error("缺少本科登录态，请先运行 pnpm test:provision");

    client = await loginSystem("oa", account);
    await checkSession(client, "oa", "oa");
  });

  it("用户信息 POST /oa/info", async () => {
    const res = await client.post("/oa/info");

    expectDataObject(res, INFO_KEYS, "info");
    expect(res.body.data?.name, "name 应为字符串").toBeTypeOf("string");
  });
});
