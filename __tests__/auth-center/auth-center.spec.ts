/** 认证中心 /auth-center 测试（本科生账号） */
import { beforeAll, describe, expect, it } from "vitest";

import type { ApiClient } from "../client.js";
import { checkSession, expectSuccess, getAccount, loginSystem } from "../helpers.js";

const account = getAccount("undergraduate");

describe("认证中心 /auth-center", () => {
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error("缺少本科登录态，请先运行 pnpm test:provision");

    client = await loginSystem("auth-center", account);
    await checkSession(client, "auth-center", "auth-center");
  });

  it("头像 POST /auth-center/avatar", async () => {
    const res = await client.post("/auth-center/avatar");

    if (!expectSuccess(res, "avatar", ["expired"])) return;

    expect(res.body.data?.avatar, "avatar 应为字符串").toBeTypeOf("string");
  });
});
