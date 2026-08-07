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

const BORROW_KEYS = [
  "name",
  "author",
  "year",
  "status",
  "barcode",
  "loanDate",
  "dueDate",
  "location",
  "shelfNumber",
  "renew",
];
const EMAIL_KEYS = ["subject", "receivedDate", "name", "email", "mid", "unread"];
const NOTICE_KEYS = ["title", "from", "time"];
const BENIGN = ["expired", "restricted"];

const account = getAccount("undergraduate");

describe("融合门户 /action", () => {
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error("缺少本科登录态，请先运行 pnpm test:provision");

    client = await loginSystem("action", account);
    await checkSession(client, "action", "action");
  });

  it("借阅图书 POST /action/borrow-books", async () => {
    const res = await client.post("/action/borrow-books");

    expectDataArray(res, BORROW_KEYS, "borrow-books", BENIGN);
  });

  it("校园卡余额 POST /action/card-balance", async () => {
    const res = await client.post("/action/card-balance");

    if (!expectSuccess(res, "card-balance", BENIGN)) return;

    expect(res.body.data, "余额应为数字").toBeTypeOf("number");
    expect(res.body.data as number, "校园卡余额应大于 0").toBeGreaterThan(0);
  });

  it("最近邮件 POST /action/recent-email", async () => {
    const res = await client.post("/action/recent-email");

    if (!expectSuccess(res, "recent-email", BENIGN)) return;

    expect(res.body.data?.unread, "unread 应为数字").toBeTypeOf("number");
    expect(Array.isArray(res.body.data?.emails), "emails 应为数组").toBe(true);

    if (res.body.data.emails.length === 0)
      console.warn("  ⚠ recent-email: emails 为空（测试账号应必有邮件）");

    res.body.data.emails.forEach((item: Record<string, unknown>, index: number) => {
      for (const key of EMAIL_KEYS)
        expect(item, `emails[${index}]: 缺少字段 ${key}`).toHaveProperty(key);
    });
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
