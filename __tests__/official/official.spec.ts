/** 学校官网 /official 端点测试（无需登录） */
import { describe, expect, it } from "vitest";

import { ApiClient } from "../client.js";
import {
  expectDataArray,
  expectDataArrayNonEmpty,
  expectObjectKeys,
  expectSuccess,
} from "../helpers.js";

const client = new ApiClient();

describe("学校官网 /official", () => {
  it("资讯列表 POST /official/info-list", async () => {
    const res = await client.post("/official/info-list", { type: "news", current: 1, total: 3 });

    expectDataArrayNonEmpty(
      res,
      ["title", "time", "pageView", "description", "url"],
      "/official/info-list",
    );
    expect(res.body.current, "应返回 current").toBeTypeOf("number");
    expect(res.body.total, "应返回 total").toBeTypeOf("number");
  });

  it("通知列表 POST /official/notice-list", async () => {
    const res = await client.post("/official/notice-list", { current: 1, total: 3 });

    expectDataArrayNonEmpty(
      res,
      ["title", "time", "pageView", "from", "url"],
      "/official/notice-list",
    );
  });

  it("学术活动列表 POST /official/academic-list", async () => {
    const res = await client.post("/official/academic-list", { current: 1, total: 3 });

    expectDataArrayNonEmpty(
      res,
      ["subject", "person", "time", "location", "pageView", "url"],
      "/official/academic-list",
    );
  });

  it("专业方案 POST /official/under-major-plan", async () => {
    const res = await client.post("/official/under-major-plan");

    expectDataArray(res, ["name", "url"], "/official/under-major-plan");
  });

  it("资讯详情 POST /official/info-detail", async () => {
    const list = await client.post("/official/info-list", { type: "news", current: 1, total: 1 });

    // 官网资讯列表持续发布，不可能为空
    expect(list.body?.success, "资讯列表应可用").toBe(true);
    expect(Array.isArray(list.body?.data) && list.body.data.length > 0, "资讯列表应非空").toBe(
      true,
    );

    const [firstInfo] = list.body.data;

    const res = await client.post("/official/info-detail", { url: firstInfo.url });

    if (!expectSuccess(res, "/official/info-detail")) return;
    expectObjectKeys(
      res.body.data,
      ["title", "time", "pageView", "content"],
      "/official/info-detail",
    );
    expect(Array.isArray(res.body.data.content), "content 应为数组").toBe(true);
  });

  it("通知详情 POST /official/notice-detail", async () => {
    const list = await client.post("/official/notice-list", { current: 1, total: 1 });

    // 官网通知列表持续发布，不可能为空
    expect(list.body?.success, "通知列表应可用").toBe(true);
    expect(Array.isArray(list.body?.data) && list.body.data.length > 0, "通知列表应非空").toBe(
      true,
    );

    const [firstNotice] = list.body.data;

    const res = await client.post("/official/notice-detail", { url: firstNotice.url });

    if (!expectSuccess(res, "/official/notice-detail")) return;
    expectObjectKeys(
      res.body.data,
      ["title", "time", "pageView", "content"],
      "/official/notice-detail",
    );
    expect(Array.isArray(res.body.data.content), "content 应为数组").toBe(true);
  });
});
