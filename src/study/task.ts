import { expiredResponse, unknownResponse } from "@/config/index.js";
import type { CommonSuccessResponse } from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";

interface RawStudyTaskItem {
  /** 课程名称 */
  kcmc: string;
  /** 课程编号 */
  kcbh: string;
  /** 教师姓名（可能多个，逗号分隔） */
  teaxm: string;
  /** 教学班代码 */
  jxbdm: string;
  /** 教学班名称 */
  jxbmc: string;
  /** 学分 */
  xf: number;
  /** 开课学时 */
  kkxs: number;
  /** 考核方式名称 */
  khfsmc: string;
  /** 课程大类名称 */
  kcdlmc: string;
  /** 教学班人数 */
  jxbrs: number;
  /** 备注 */
  bz: string;
}

interface RawStudyTaskSuccessResult {
  data: "";
  rows: RawStudyTaskItem[];
  total: number;
}

interface RawStudyTaskFailedResult {
  code: number;
  data: string;
  message: string;
}

type RawStudyTaskResult = RawStudyTaskSuccessResult | RawStudyTaskFailedResult;

export interface StudyTaskQueryOptions {
  /** 学年学期代码（如 202502），缺省为当前学期 */
  time?: string;
}

export interface StudyTask {
  /** 课程名称 */
  name: string;
  /** 课程编号 */
  courseCode: string;
  /** 授课教师 */
  teachers: string[];
  /** 教学班代码 */
  classId: string;
  /** 教学班名称 */
  className: string;
  /** 学分 */
  credit: number;
  /** 开课学时 */
  hours: number;
  /** 考核方式 */
  examType: string;
  /** 课程大类 */
  category: string;
  /** 教学班人数 */
  classSize: number;
  /** 备注 */
  note: string;
}

export type StudyTaskSuccessResponse = CommonSuccessResponse<StudyTask[]>;

export type StudyTaskResponse = StudyTaskSuccessResponse | AuthLoginFailedResponse;

const getTeachers = (teachersName: string): string[] =>
  teachersName.split(",").filter((name) => name.length > 0);

export const getStudyTask = async (
  cookieHeader: string,
  server: string,
  { time }: StudyTaskQueryOptions,
): Promise<StudyTaskResponse> => {
  const response = await fetch(`${server}/new/student/xskcrw/skrwDatas`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${server}/new/student/xskcrw/list.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      xnxqdm: time ?? "",
      page: "1",
      rows: "50",
      sort: "kcrwdm",
      order: "asc",
    }),
  });

  if (response.headers.get("Content-Type")?.includes("text/html")) return expiredResponse;

  const data = (await response.json()) as RawStudyTaskResult;

  if ("code" in data) {
    if (data.message === "尚未登录，请先登录") return expiredResponse;

    return unknownResponse(data.message);
  }

  return {
    success: true,
    data: data.rows.map(
      ({ kcmc, kcbh, teaxm, jxbdm, jxbmc, xf, kkxs, khfsmc, kcdlmc, jxbrs, bz }) => ({
        name: kcmc,
        courseCode: kcbh,
        teachers: getTeachers(teaxm),
        classId: jxbdm,
        className: jxbmc,
        credit: xf,
        hours: kkxs,
        examType: khfsmc,
        category: kcdlmc,
        classSize: jxbrs,
        note: bz,
      }),
    ),
  };
};

export const STUDY_TASK_TEST_RESPONSE: StudyTaskSuccessResponse = {
  success: true,
  data: Array.from({ length: 3 }, (_, index): StudyTask => ({
    name: `测试课程${index + 1}`,
    courseCode: "0000000000000",
    teachers: ["测试教师"],
    classId: "00000000",
    className: `教学班${index + 1}`,
    credit: 3,
    hours: 54,
    examType: "考试",
    category: "通识教育必修课",
    classSize: 50,
    note: "",
  })),
};
