/** 本科教务（新）/under-study 测试（本科生账号） */
import { beforeAll, describe, expect, it } from "vitest";

import type { ApiClient, ApiResponse } from "../client.js";
import { CURRENT_SEMESTER, FALLBACK_SEMESTER } from "../config.js";
import {
  checkSession,
  expectArrayItems,
  expectDataArray,
  expectDataObject,
  expectSuccess,
  getAccount,
  loginSystem,
} from "../helpers.js";

const INFO_KEYS = [
  "id",
  "name",
  "idCard",
  "org",
  "orgId",
  "major",
  "majorId",
  "inYear",
  "grade",
  "type",
  "typeId",
  "people",
  "gender",
  "genderId",
  "birth",
  "location",
];
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
const DETAIL_KEYS = ["name", "score", "percent"];
const SPECIAL_KEYS = ["semester", "time", "name", "grade", "gradeCode"];
const STUDY_PLAN_KEYS = ["planId", "planCode", "grade", "major", "planType", "note"];
const STUDY_PLAN_COURSE_KEYS = [
  "name",
  "courseCode",
  "credit",
  "hours",
  "semester",
  "studyType",
  "examType",
  "category",
  "gradeMethod",
];
const TASK_KEYS = [
  "name",
  "courseCode",
  "teachers",
  "classId",
  "className",
  "credit",
  "hours",
  "examType",
  "category",
  "classSize",
  "note",
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
const ALLOWED_KEYS = [
  "name",
  "link",
  "term",
  "canSelect",
  "isPublic",
  "stage",
  "canRemove",
  "startTime",
  "endTime",
];
const DISALLOWED_KEYS = ["name", "link", "term", "canSelect", "description"];
const COURSE_KEYS = ["name", "teachers", "time", "weeks", "locations", "classIndex"];
const SEARCH_KEYS = [
  "name",
  "office",
  "shortType",
  "type",
  "category",
  "point",
  "hours",
  "id",
  "code",
];
const SELECTED_KEYS = [
  ...SEARCH_KEYS,
  "teacher",
  "place",
  "time",
  "capacity",
  "current",
  "classCode",
  "classId",
];

const account = getAccount("undergraduate");

/** 带 fallback 的成绩列表查询 */
const queryGradeList = async (client: ApiClient): Promise<ApiResponse> => {
  const primary = await client.post("/under-study/grade-list", { time: CURRENT_SEMESTER });

  if (
    primary.body?.success !== true ||
    !Array.isArray(primary.body.data) ||
    primary.body.data.length === 0
  ) {
    console.warn(`  ⚠ ${CURRENT_SEMESTER} 无成绩，fallback 到 ${FALLBACK_SEMESTER}`);

    return client.post("/under-study/grade-list", { time: FALLBACK_SEMESTER });
  }

  return primary;
};

describe("本科教务（新）/under-study", () => {
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error("缺少本科登录态，请先运行 pnpm test:provision");

    client = await loginSystem("under-study", account);
    await checkSession(client, "under-study", "under-study");
  });

  it("个人信息 POST /under-study/info", async () => {
    const res = await client.post("/under-study/info");

    expectDataObject(res, INFO_KEYS, "info");
    expect(res.body.data?.id, "id 应为数字").toBeTypeOf("number");
    expect(res.body.data?.name, "name 应为字符串").toBeTypeOf("string");
  });

  it("成绩列表 POST /under-study/grade-list", async () => {
    const res = await queryGradeList(client);

    if (!expectSuccess(res, "grade-list", ["expired"])) return;

    expect(Array.isArray(res.body.data), "成绩应为数组").toBe(true);
    expect(res.body.data.length, "成绩必须非空（测试账号必有成绩）").toBeGreaterThan(0);
    expectArrayItems(res.body.data, GRADE_KEYS, "grade-list");
  });

  it("成绩详情 POST /under-study/grade-detail", async () => {
    const list = await queryGradeList(client);

    if (list.body?.success !== true || list.body?.data?.length === 0)
      expect.fail("成绩列表为空，无法测试成绩详情");

    const gradeCode = list.body.data[0]?.gradeCode;

    expect(gradeCode, "成绩项应包含 gradeCode").toBeTruthy();

    const res = await client.post("/under-study/grade-detail", { gradeCode });

    if (!expectSuccess(res, "grade-detail", ["expired"])) return;

    expect(Array.isArray(res.body.data), "详情应为数组").toBe(true);
    expect(res.body.data.length, "成绩详情必须非空").toBeGreaterThan(0);
    expectArrayItems(res.body.data, DETAIL_KEYS, "grade-detail");
  });

  it("特殊考试 POST /under-study/special-exam", async () => {
    const res = await client.post("/under-study/special-exam");

    expectDataArray(res, SPECIAL_KEYS, "special-exam", ["expired"]);
  });

  it("考试安排 POST /under-study/exam-arrangement", async () => {
    const res = await client.post("/under-study/exam-arrangement", {
      time: CURRENT_SEMESTER,
    });

    expectDataArray(res, EXAM_KEYS, "exam-arrangement", ["expired"]);
  });

  it("学习计划 POST /under-study/study-plan list", async () => {
    const res = await client.post("/under-study/study-plan", { type: "list" });

    // list 现只返回单个"教学计划"对象（不再返回数组）
    expectDataObject(res, STUDY_PLAN_KEYS, "study-plan list", ["expired"]);
  });

  it("学习计划 POST /under-study/study-plan detail", async () => {
    const list = await client.post("/under-study/study-plan", { type: "list" });

    // list 返回单个教学计划对象（非数组），直接用其 planCode 查明细
    if (list.body?.success !== true || !list.body?.data)
      expect.fail("未获取到教学计划，无法测试明细");

    const res = await client.post("/under-study/study-plan", {
      type: "detail",
      planCode: list.body.data.planCode,
    });

    if (!expectSuccess(res, "study-plan detail", ["expired"])) return;

    expect(Array.isArray(res.body.data), "明细 data 应为数组").toBe(true);
    expect(res.body.total, "应包含 total").toBeTypeOf("number");
    expect(res.body.current, "应包含 current").toBeTypeOf("number");
    expectArrayItems(res.body.data, STUDY_PLAN_COURSE_KEYS, "study-plan detail");
  });

  it("上课任务 POST /under-study/task", async () => {
    const res = await client.post("/under-study/task");

    // 暑假可能无上课任务（data 可为空数组）
    expectDataArray(res, TASK_KEYS, "task", ["expired"]);
  });

  it("课程表 POST /under-study/course-table", async () => {
    const res = await client.post("/under-study/course-table", { time: CURRENT_SEMESTER });

    if (!expectSuccess(res, "course-table", ["expired", "forbidden"])) return;

    expect(res.body.data?.table, "课表 table 应存在").toBeTruthy();
    expect(Array.isArray(res.body.data.table), "table 应为数组").toBe(true);

    let courseCount = 0;

    for (const row of res.body.data.table as unknown[][]) {
      expect(Array.isArray(row), "课表行应为数组").toBe(true);

      for (const cell of row as unknown[][]) {
        expect(Array.isArray(cell), "课表单元格应为数组").toBe(true);

        for (const course of cell as Record<string, unknown>[]) {
          courseCount += 1;

          for (const key of COURSE_KEYS) expect(course, `课程缺字段 ${key}`).toHaveProperty(key);
        }
      }
    }

    expect(courseCount, "课表必须包含课程").toBeGreaterThan(0);
  });

  it("评教列表 POST /under-study/course-commentary", async () => {
    const res = await client.post("/under-study/course-commentary", {
      type: "list",
      time: CURRENT_SEMESTER,
    });

    expectDataArray(res, COMMENTARY_KEYS, "course-commentary list", ["expired"]);
  });

  it("选课分类 POST /under-study/select/category", async () => {
    const res = await client.post("/under-study/select/category");

    // not-initialized：非选课期（如假期）选课未初始化，属正常场景
    if (!expectSuccess(res, "select/category", ["expired", "not-initialized"])) return;

    expect(Array.isArray(res.body.data?.allowed), "allowed 应为数组").toBe(true);
    expect(Array.isArray(res.body.data?.disallowed), "disallowed 应为数组").toBe(true);
    expectArrayItems(res.body.data.allowed, ALLOWED_KEYS, "allowed");
    expectArrayItems(res.body.data.disallowed, DISALLOWED_KEYS, "disallowed");
  });

  it("选课信息/搜索/已选 POST /under-study/select", async () => {
    const category = await client.post("/under-study/select/category");

    if (category.body?.success !== true) {
      console.warn("  ⚠ 选课分类不可用，跳过");

      return;
    }

    const link = category.body.data?.allowed?.[0]?.link;

    if (!link) {
      console.warn("  ⚠ 当前无可选课分类（非选课期），跳过");

      return;
    }

    const info = await client.post("/under-study/select/info", { link });

    if (!expectSuccess(info, "select/info", ["expired"])) return;

    expect(info.body.data?.term, "select/info 应返回 term").toBeTypeOf("string");

    const search = await client.post("/under-study/select/search", { link });

    expectDataArray(search, SEARCH_KEYS, "select/search", ["expired"]);

    const selected = await client.post("/under-study/select/selected", { link });

    expectDataArray(selected, SELECTED_KEYS, "select/selected", ["expired"]);
  });
});
