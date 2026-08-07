/** 本科教务（旧）/under-system 测试（本科生账号） */
import { beforeAll, describe, expect, it } from "vitest";

import type { ApiClient } from "../client.js";
import { LEGACY_SEMESTER } from "../config.js";
import {
  checkSession,
  expectArrayItems,
  expectObjectKeys,
  expectSuccess,
  getAccount,
  loginSystem,
} from "../helpers.js";

const INFO_KEYS = [
  "name",
  "gender",
  "idCard",
  "politicalType",
  "birth",
  "people",
  "id",
  "grade",
  "school",
  "major",
  "majorType",
  "inDate",
  "language",
  "candidateId",
  "candidateType",
  "province",
  "cultivateType",
  "category",
];
const PLAN_KEYS = [
  "school",
  "major",
  "subject",
  "examType",
  "time",
  "location",
  "plan",
  "current",
  "requirement",
  "contact",
  "phone",
];
const EXAM_PLACE_KEYS = ["course", "time", "campus", "building", "classroom"];
const COURSE_KEYS = ["name", "teachers", "time", "weeks", "locations", "classIndex"];
const ARCHIVE_KEYS = [
  "archiveImage",
  "examImage",
  "basic",
  "study",
  "family",
  "canRegister",
  "isRegistered",
  "path",
];
const APPLY_KEYS = ["url", "name", "time", "type"];
const RESULT_KEYS = ["name", "time", "type", "status"];
const BENIGN = ["expired"];

const account = getAccount("undergraduate");

describe("本科教务（旧）/under-system", () => {
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error("缺少本科登录态，请先运行 pnpm test:provision");

    client = await loginSystem("under-system", account);
    await checkSession(client, "under-system", "under-system");
  });

  it("个人信息 POST /under-system/info", async () => {
    const res = await client.post("/under-system/info");

    if (!expectSuccess(res, "info", BENIGN)) return;

    expectObjectKeys(res.body.info, INFO_KEYS, "info");
    expect(res.body.info?.id, "id 应为数字").toBeTypeOf("number");
    expect(res.body.info?.name, "name 应为字符串").toBeTypeOf("string");
  });

  it("课程表 POST /under-system/course-table", async () => {
    const res = await client.post("/under-system/course-table", { time: LEGACY_SEMESTER });

    if (!expectSuccess(res, "course-table", [...BENIGN, "forbidden"])) return;

    expect(res.body.data?.table, "课表 table 应存在").toBeTruthy();
    expect(Array.isArray(res.body.data.table), "table 应为数组").toBe(true);

    let courseCount = 0;

    for (const row of res.body.data.table as unknown[][]) {
      for (const cell of row as unknown[][]) {
        for (const course of cell as Record<string, unknown>[]) {
          courseCount += 1;

          for (const key of COURSE_KEYS) expect(course, `课程缺字段 ${key}`).toHaveProperty(key);
        }
      }
    }

    expect(courseCount, "课表必须包含课程").toBeGreaterThan(0);
  });

  it("转专业计划 POST /under-system/change-major-plan", async () => {
    const res = await client.post("/under-system/change-major-plan");

    if (!expectSuccess(res, "change-major-plan", BENIGN)) return;

    expect(res.body.header, "header 应为字符串").toBeTypeOf("string");
    expect(Array.isArray(res.body.plans), "plans 应为数组").toBe(true);
    expectArrayItems(res.body.plans, PLAN_KEYS, "plans");
  });

  it("考场查询 POST /under-system/exam-place", async () => {
    const res = await client.post("/under-system/exam-place");

    if (!expectSuccess(res, "exam-place", BENIGN)) return;

    expect(Array.isArray(res.body.data), "data 应为数组").toBe(true);

    for (const item of res.body.data as { name?: string; exams?: unknown[] }[]) {
      expectObjectKeys(item, ["name", "exams"], "exam-place item");
      expectArrayItems(item.exams, EXAM_PLACE_KEYS, "exams");
    }
  });

  it("学籍档案 POST /under-system/student-archive", async () => {
    const res = await client.post("/under-system/student-archive", { type: "get" });

    if (!expectSuccess(res, "student-archive get", BENIGN)) return;

    expectObjectKeys(res.body.info, ARCHIVE_KEYS, "student-archive");
  });

  it("四六级查询 POST /under-system/test-query", async () => {
    const res = await client.post("/under-system/test-query");

    if (!expectSuccess(res, "test-query", BENIGN)) return;

    expect(Array.isArray(res.body.apply), "apply 应为数组").toBe(true);
    expect(Array.isArray(res.body.result), "result 应为数组").toBe(true);
    expectArrayItems(res.body.apply, APPLY_KEYS, "apply");
    expectArrayItems(res.body.result, RESULT_KEYS, "result");
  });
});
