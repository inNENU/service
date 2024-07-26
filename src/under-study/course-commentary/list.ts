import type { RawUnderCourseCommentaryFailResult } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import type { ActionFailType } from "../../config/index.js";
import { ExpiredResponse } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../../utils/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

const MAIN_URL = `${UNDER_STUDY_SERVER}/new/student/teapj`;
const LIST_URL = `${UNDER_STUDY_SERVER}/new/student/teapj/pjDatas`;

const SELECTED_OPTION_REG =
  /<option value='([^']*?)' selected>([^<]*?)<\/option>/;

const getCurrentTime = async (
  cookieHeader: string,
): Promise<{ time: string; value: string }> => {
  const response = await fetch(MAIN_URL, {
    headers: {
      Cookie: cookieHeader,
      ...EDGE_USER_AGENT_HEADERS,
      referer: `${UNDER_STUDY_SERVER}/new/student/teapj`,
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

interface RawUnderCourseCommentaryListResultItem {
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

interface RawUnderCourseCommentaryListSuccessResult {
  data: "";
  rows: RawUnderCourseCommentaryListResultItem[];
  total: number;
}

type RawUnderCourseCommentaryListResult =
  | RawUnderCourseCommentaryListSuccessResult
  | RawUnderCourseCommentaryFailResult;

export interface UnderCourseCommentaryItem {
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

const getCourseList = (
  records: RawUnderCourseCommentaryListResultItem[],
): UnderCourseCommentaryItem[] =>
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

export interface ListUnderCourseCommentaryOptions extends LoginOptions {
  type: "list";
  /** 查询时间 */
  time?: string;
}

export type UnderCourseCommentaryListSuccessResponse = CommonSuccessResponse<
  UnderCourseCommentaryItem[]
>;

export type UnderCourseCommentaryListResponse =
  | UnderCourseCommentaryListSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<
      | ActionFailType.Expired
      | ActionFailType.MissingCredential
      | ActionFailType.Unknown
    >;

export const listUnderCourseCommentary = async (
  cookieHeader: string,
  time?: string,
): Promise<UnderCourseCommentaryListResponse> => {
  const commentaryTime = time ?? (await getCurrentTime(cookieHeader)).value;

  const response = await fetch(LIST_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${UNDER_STUDY_SERVER}/new/student/teapj`,
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

  if (response.headers.get("Content-Type")?.includes("text/html"))
    return ExpiredResponse;

  const data = (await response.json()) as RawUnderCourseCommentaryListResult;

  if ("code" in data) {
    if (data.message === "尚未登录，请先登录") return ExpiredResponse;

    throw new Error(data.message);
  }

  return {
    success: true,
    data: getCourseList(data.rows),
  };
};
