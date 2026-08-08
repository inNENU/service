/** 研究生教务 /grad-study 测试（研究生账号，dsyjs 系统） */
import { beforeAll, describe, expect, it } from "vitest";

import type { ApiClient } from "../client.js";
import {
  checkSession,
  expectDataArray,
  expectSuccess,
  getAccount,
  loginSystem,
} from "../helpers.js";

const GRADE_KEYS = [
  "time",
  "cid",
  "name",
  "grade",
  "gradeCode",
  "gradeText",
  "gradeType",
  "courseType",
  "shortCourseType",
  "hours",
  "point",
  "mark",
  "office",
  "examType",
];

/** 研究生当前学期（dsyjs 格式，如 202502 = 2025 学年第二学期） */
const GRAD_SEMESTER = "202502";

const COMMENTARY_KEYS = [
  "term",
  "endDate",
  "name",
  "courseCode",
  "teacherName",
  "teacherCode",
  "teachingLinkName",
  "commentaryCode",
];

const EXAM_KEYS = [
  "name",
  "courseCode",
  "date",
  "time",
  "form",
  "assessmentForm",
  "category",
  "arrangementType",
  "week",
  "weekday",
  "classPeriods",
  "campus",
  "room",
  "seat",
  "paperId",
  "hours",
  "note",
];

const account = getAccount("graduate");

describe("研究生教务 /grad-study", () => {
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error("缺少研究生登录态，请先运行 pnpm test:provision");

    client = await loginSystem("grad-study", account);
  });

  it("会话验证 POST /grad-study/check", async () => {
    if (!account) throw new Error("缺少研究生登录态，请先运行 pnpm test:provision");

    await checkSession(client, "grad-study", "check");
  });

  it("成绩列表 POST /grad-study/grade-list", async () => {
    if (!account) throw new Error("缺少研究生登录态，请先运行 pnpm test:provision");

    const res = await client.post("/grad-study/grade-list", { time: "" });

    expectDataArray(res, GRADE_KEYS, "grade-list");
  });

  it("课表 POST /grad-study/course-table", async () => {
    if (!account) throw new Error("缺少研究生登录态，请先运行 pnpm test:provision");

    const res = await client.post("/grad-study/course-table", { time: GRAD_SEMESTER });

    if (!expectSuccess(res, "course-table", ["expired"])) return;

    expect(res.body.data?.table, "课表 table 应存在").toBeTruthy();
    expect(Array.isArray(res.body.data.table), "table 应为数组").toBe(true);

    for (const row of res.body.data.table as unknown[][]) {
      expect(Array.isArray(row), "课表行应为数组").toBe(true);
      expect(row).toHaveLength(7);
    }
  });

  it("评教列表 POST /grad-study/course-commentary", async () => {
    if (!account) throw new Error("缺少研究生登录态，请先运行 pnpm test:provision");

    // 不传 time，由服务端自动探测学期（dsyjs 学期代码格式与 bkjx 不同）
    const res = await client.post("/grad-study/course-commentary", { type: "list" });

    expectDataArray(res, COMMENTARY_KEYS, "course-commentary list", ["expired"]);
  });

  it("考试安排 POST /grad-study/exam-arrangement", async () => {
    if (!account) throw new Error("缺少研究生登录态，请先运行 pnpm test:provision");

    const res = await client.post("/grad-study/exam-arrangement", { time: GRAD_SEMESTER });

    // 研究生账号可能无考试安排（data 可为空数组），仅校验结构
    expectDataArray(res, EXAM_KEYS, "exam-arrangement", ["expired"]);
  });
});
