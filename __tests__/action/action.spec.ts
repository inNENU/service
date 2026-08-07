/** 融合门户 /action 测试（本科生账号） */
import { beforeAll, describe, expect, it } from "vitest";

import type { ApiClient } from "../client.js";
import {
  checkSession,
  expectDataArray,
  expectSuccess,
  getAccount,
  loginSystem,
} from "../helpers.js";

const EMAIL_KEYS = ["subject", "date", "id"];
const NOTICE_KEYS = ["title", "from", "time", "id"];
const BENIGN = ["expired", "restricted"];

const account = getAccount("undergraduate");

describe("融合门户 /action", () => {
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error("缺少本科登录态，请先运行 pnpm test:provision");

    client = await loginSystem("action", account);
    await checkSession(client, "action", "action");
  });

  it("最近邮件 POST /action/recent-email", async () => {
    const res = await client.post("/action/recent-email");

    expectDataArray(res, EMAIL_KEYS, "recent-email", BENIGN);
  });

  it("通知列表 POST /action/notice-list", async () => {
    const res = await client.post("/action/notice-list", { type: "notice", size: 5 });

    if (!expectSuccess(res, "notice-list", BENIGN)) return;

    expect(Array.isArray(res.body.data), "data 应为数组").toBe(true);
    expect(res.body.data.length, "通知列表必须非空").toBeGreaterThan(0);

    res.body.data.forEach((item: Record<string, unknown>, index: number) => {
      for (const key of NOTICE_KEYS)
        expect(item, `notice[${index}]: 缺少字段 ${key}`).toHaveProperty(key);
    });
  });

  it("通知详情 POST /action/notice-detail", async () => {
    const list = await client.post("/action/notice-list", { type: "notice", size: 1 });

    if (list.body?.success !== true || list.body?.data?.length === 0) {
      console.warn("  ⚠ 通知列表为空，跳过详情测试");

      return;
    }

    const [notice] = list.body.data;

    if (!notice?.id && !notice?.url) {
      console.warn("  ⚠ 通知项缺少 id/url，跳过详情测试");

      return;
    }

    const res = await client.post("/action/notice-detail", {
      ...(notice.id ? { noticeID: notice.id } : {}),
      ...(notice.url ? { noticeUrl: notice.url } : {}),
    });

    if (!expectSuccess(res, "notice-detail", [...BENIGN, "missing-arg"])) return;

    for (const key of ["title", "from", "time", "pageView", "content"])
      expect(res.body.data, `notice-detail: 缺少字段 ${key}`).toHaveProperty(key);
  });

  it("邮件页面重定向 POST /action/email-page", async () => {
    const res = await client.post("/action/email-page");

    if (!expectSuccess(res, "email-page", BENIGN)) return;

    expect(res.body.data, "应为 URL 字符串").toBeTypeOf("string");
    expect((res.body.data as string).length).toBeGreaterThan(0);
  });
});
