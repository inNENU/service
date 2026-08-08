import type { ActionFailType } from "@/config/index.js";
import { expiredResponse, unknownResponse } from "@/config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse, LoginOptions } from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../../auth/index.js";
import type { RawCourseCommentaryFailResult } from "./utils.js";

const SELECTED_OPTION_REG = /<option value='([^']*?)' selected>([^<]*?)<\/option>/u;

const getCurrentTime = async (
  cookieHeader: string,
  server: string,
): Promise<{ time: string; value: string }> => {
  const response = await fetch(`${server}/new/student/teapj`, {
    headers: {
      Cookie: cookieHeader,
      ...EDGE_USER_AGENT_HEADERS,
      referer: `${server}/new/student/teapj`,
    },
  });

  const html = await response.text();
  const timeMatch = SELECTED_OPTION_REG.exec(html);

  if (!timeMatch) throw new Error("无法获取当前评教日期");

  const [, value, time] = timeMatch;

  return {
    time,
    value,
  };
};

interface RawCourseCommentaryListResultItem {
  rownum_: number;
  /** 教师编号 */
  teabh: string;
  /** 教师代码 */
  teadm: string;
  /** 评价代码 */
  pjdm: string;
  /** 课程代码 */
  dgksdm: string;
  /** 教师姓名 */
  teaxm: string;
  /** 教学环节代码 */
  jxhjdm: string;
  /** 教学环节名称 */
  jxhjmc: string;
  /** 结课日期 */
  jkrq: string;
  /** 学年学期代码 */
  xnxqdm: string;
  /** 课程名称 */
  kcmc: string;
  kcrwdm: string;
  /** 修读学期 */
  xnxqmc: string;
  /** 学生代码 */
  xsdm: string;
}

interface RawCourseCommentaryListSuccessResult {
  data: "";
  rows: RawCourseCommentaryListResultItem[];
  total: number;
}

type RawCourseCommentaryListResult =
  | RawCourseCommentaryListSuccessResult
  | RawCourseCommentaryFailResult;

export interface CourseCommentaryItem {
  /** 修读学期 */
  term: string;
  /** 结课日期 */
  endDate: string;
  /** 课程名称 */
  name: string;
  /** 教师名称 */
  teacherName: string;
  /** 课程代码 */
  courseCode: string;
  /** 教师代码 */
  teacherCode: string;
  /** 教学环节名称 */
  teachingLinkName: string;
  /** 评价代码 */
  commentaryCode: string;
}

const getCourseList = (records: RawCourseCommentaryListResultItem[]): CourseCommentaryItem[] =>
  records.map(
    ({
      xnxqmc: term,
      jkrq: endDate,
      kcmc: name,
      dgksdm: courseCode,
      teaxm: teacherName,
      teadm: teacherCode,
      jxhjmc: teachingLinkName,
      pjdm: commentaryCode,
    }) => ({
      term,
      endDate,
      name,
      courseCode,
      teacherName,
      teacherCode,
      teachingLinkName,
      commentaryCode,
    }),
  );

export interface ListCourseCommentaryOptions extends LoginOptions {
  type: "list";
  /** 查询时间 */
  time?: string;
}

export type CourseCommentaryListSuccessResponse = CommonSuccessResponse<CourseCommentaryItem[]>;

export type CourseCommentaryListResponse =
  | CourseCommentaryListSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<
      ActionFailType.Expired | ActionFailType.MissingCredential | ActionFailType.Unknown
    >;

export const COURSE_COMMENTARY_LIST_TEST_RESPONSE: CourseCommentaryListSuccessResponse = {
  success: true,
  data: [
    {
      term: "2020-2021-2",
      endDate: "2021-01-01",
      name: "测试课程",
      courseCode: "TEST",
      teacherName: "测试教师",
      teacherCode: "TEST",
      teachingLinkName: "测试环节",
      commentaryCode: "TEST",
    },
  ],
};

export const listCommentary = async (
  cookieHeader: string,
  time: string | undefined,
  server: string,
): Promise<CourseCommentaryListResponse> => {
  const commentaryTime = time ?? (await getCurrentTime(cookieHeader, server)).value;

  const response = await fetch(`${server}/new/student/teapj/pjDatas`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${server}/new/student/teapj`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      xnxqdm: commentaryTime,
      source: "kccjlist",
      primarySort: "kcrwdm asc",
      page: "1",
      rows: "150",
      sort: "jkrq",
      order: "asc",
    }),
  });

  if (response.headers.get("Content-Type")?.includes("text/html")) return expiredResponse;

  const data = (await response.json()) as RawCourseCommentaryListResult;

  if ("code" in data) {
    if (data.message === "尚未登录，请先登录") return expiredResponse;

    return unknownResponse(data.message);
  }

  return {
    success: true,
    data: getCourseList(data.rows),
  };
};
