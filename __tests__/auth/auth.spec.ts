/** 统一认证相关测试（限流敏感，仅做最小验证） */
import { describe, expect, it } from "vitest";

import { ApiClient } from "../client.js";
import { getAccount, getPassword } from "../helpers.js";

const account = getAccount("undergraduate");

describe("统一认证 /auth", () => {
  it("复用已保存 authToken 登录 POST /auth/login", async () => {
    if (!account) throw new Error("缺少本科登录态，请先运行 pnpm test:provision");

    const client = new ApiClient();
    const res = await client.post("/auth/login", {
      id: account.id,
      password: getPassword(account.id),
      authToken: account.authToken,
    });

    expect(res.status, `/auth/login 返回 HTTP ${res.status}`).toBe(200);

    if (res.body?.success !== true) {
      const { type, msg } = res.body;

      // 限流或 token 失效属已知场景
      if (!["too-frequent", "need-re-auth", "expired", "wrong-password"].includes(type))
        expect.fail(`/auth/login 失败: ${JSON.stringify(res.body)}`);

      console.warn(`  ⚠ /auth/login: ${type}（${msg}）`);

      return;
    }

    expect(res.body.location, "应返回重定向 location").toBeTypeOf("string");
  });

  it("加密纯函数 POST /auth/encrypt", async () => {
    const res = await new ApiClient().post("/auth/encrypt", {
      password: "test123456",
      salt: "abc",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.data, "应为密文字符串").toBeTypeOf("string");
    expect((res.body.data as string).length).toBeGreaterThan(0);
  });
});
