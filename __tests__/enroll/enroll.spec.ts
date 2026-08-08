/** 招生 /enroll 端点测试（无需登录） */
import { describe, expect, it } from "vitest";

import { ApiClient } from "../client.js";
import { expectArrayItems, expectObjectKeys, expectSuccess } from "../helpers.js";
import type { EnrollInfo } from "../state.js";
import { readEnrollInfo } from "../state.js";

const client = new ApiClient();

// 真实考生信息位于 git 忽略的 temp/enroll-info.json，缺失时跳过该测试
let enrollInfo: EnrollInfo | null = null;

try {
  enrollInfo = readEnrollInfo();
} catch (err) {
  console.warn(`  ⚠ 跳过 under-admission：${(err as Error).message}`);
}

describe("招生 /enroll", () => {
  it("本科历史分数 POST /enroll/under-history-score", async () => {
    const res = await client.post("/enroll/under-history-score", { type: "info" });

    if (!expectSuccess(res, "/enroll/under-history-score")) return;
    expect(res.body.data, "应为嵌套对象").toBeTypeOf("object");
    expect(Object.keys(res.body.data).length, "嵌套对象应非空（至少包含省份）").toBeGreaterThan(0);
  });

  it("本科招生计划 POST /enroll/under-plan", async () => {
    const res = await client.post("/enroll/under-plan", { type: "info" });

    if (!expectSuccess(res, "/enroll/under-plan")) return;
    expect(res.body.data, "应为嵌套对象").toBeTypeOf("object");
    expect(Object.keys(res.body.data).length, "嵌套对象应非空（至少包含省份）").toBeGreaterThan(0);
  });

  it("本科招生查询 POST /enroll/under-admission", async () => {
    if (enrollInfo == null) {
      console.warn("  ⚠ 跳过 under-admission：temp/enroll-info.json 缺失");

      return;
    }

    const res = await client.post("/enroll/under-admission", enrollInfo);

    // 无匹配信息时返回结构化错误（身份证号或考生号不正确），或招生季外返回 closed
    expect(res.status).toBe(200);
    expect(res.body, "应返回 JSON 信封").toHaveProperty("success");

    if (res.body?.success === true)
      expectArrayItems(res.body.data, ["text", "value"], "under-admission");
    else expect(["closed", "unknown"]).toContain(res.body?.type);
  });

  it("研究生招生计划 POST /enroll/grad-plan（缺省最新年份）", async () => {
    const res = await client.post("/enroll/grad-plan");

    if (!expectSuccess(res, "/enroll/grad-plan")) return;
    expect(Array.isArray(res.body.data), "data 应为数组").toBe(true);
    expect(res.body.data.length, "应包含至少一个院部").toBeGreaterThan(0);

    for (const plan of res.body.data) {
      expectObjectKeys(
        plan,
        ["name", "code", "site", "contact", "phone", "mail", "note", "majors"],
        "grad-plan item",
      );
      expect(Array.isArray(plan.majors), "majors 应为数组").toBe(true);

      for (const major of plan.majors) {
        expectObjectKeys(major, ["name", "code", "type", "directions"], "grad-plan major");
        expectArrayItems(
          major.directions,
          ["name", "code", "count", "recommendCount", "subjects", "note"],
          "grad-plan direction",
        );
      }
    }
  });

  it("研究生招生计划 POST /enroll/grad-plan 指定年份 2025", async () => {
    const res = await client.post("/enroll/grad-plan", { nd: 2025 });

    if (!expectSuccess(res, "/enroll/grad-plan nd=2025")) return;
    expect(Array.isArray(res.body.data), "data 应为数组").toBe(true);
    expect(res.body.data.length, "应包含至少一个院部").toBeGreaterThan(0);
  });

  it("研究生招生计划 POST /enroll/grad-plan 非法年份", async () => {
    const res = await client.post("/enroll/grad-plan", { nd: 2024 });

    expect(res.status).toBe(200);
    expect(res.body, "应返回失败信封").toHaveProperty("success", false);
    expect(res.body.type, "非法年份应返回 invalid-arg").toBe("invalid-arg");
  });

  it("研究生推免计划 POST /enroll/grad-recommend-plan", async () => {
    const res = await client.post("/enroll/grad-recommend-plan");

    if (!expectSuccess(res, "/enroll/grad-recommend-plan", ["closed"])) return;
    expect(Array.isArray(res.body.data), "data 应为数组").toBe(true);

    for (const plan of res.body.data) {
      expectObjectKeys(
        plan,
        ["name", "code", "site", "contact", "phone", "mail", "majors"],
        "grad-recommend item",
      );
      expect(Array.isArray(plan.majors), "majors 应为数组").toBe(true);
      expectArrayItems(plan.majors, ["name", "code", "content"], "grad-recommend majors");
    }
  });
});
