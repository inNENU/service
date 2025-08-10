import { EDGE_USER_AGENT_HEADERS, request } from "@/utils/index.js";

import { UNDER_STUDY_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { ExpiredResponse, UnknownResponse } from "../config/index.js";
import type { CommonFailedResponse, LoginOptions } from "../typings.js";

export interface UnderGradeListOptions extends LoginOptions {
  /** 查询时间 */
  time?: string;
}

interface RawUnderGradeResultItem {
  /** 修读学期 */
  xnxqmc: string;
  /** 课程名称 */
  kcmc: string;
  /** 课程英文名称 */
  kcywmc: string;
  /** 课程类别 */
  kcdlmc: string;
  /** 课程成绩文字 */
  zcj: string;
  /** 课程实际成绩 */
  zcjfs: number;
  /** 考试性质 */
  ksxzmc: "正常考试" | "校际交流" | "补考";
  /** 成绩方式 */
  cjfsmc: "百分制" | "五级制";
  /** 学分 */
  xf: number;
  /** 总学时 */
  zxs: number;
  /** 修读方式名称 */
  xdfsmc: string;
  /** 开课单位 */
  kkbmmc: string;
  /** 成绩标识 */
  cjbzmc: string;

  /** 学年学期代码 */
  xnxqdm: string;
  /** 课程编号 */
  kcbh: string;
  /** 课程平台编号 */
  kcptbh: string;
  /** 考试性质代码 */
  ksxzdm: string;
  /** 课程代码 */
  kcdm: string;
  /** 修读方式代码 */
  xdfsdm: string;
  /** 成绩代码 */
  cjdm: string;
  /** 考核分数代码 */
  khfsdm: string;

  /** 学生姓名 */
  xsxm: string;
  /** 学号 */
  xsbh: string;
  /** 学生代码 */
  xsdm: string;

  xsckcj: "0";
  rownum_: number;
  ismax: "1" | "0";
  isactive: "1";
  wpjbz: "";
  kcflmc: "";
  cjjd: "";
  bz: "";
  xsckcjbz: "";
  kcrwdm: "";
  wzc: "0";
  wpj: "0";

  xmmc: "";
  rwdm: "";
  wzcbz: "";
}

interface RawUnderGradeSuccessResult {
  data: "";
  rows: RawUnderGradeResultItem[];
  total: number;
}

interface RawUnderGradeFailedResult {
  code: number;
  data: string;
  message: string;
}

type RawUnderGradeResult =
  | RawUnderGradeSuccessResult
  | RawUnderGradeFailedResult;

export interface UnderStudyGradeResult {
  /** 修读时间 */
  time: string;
  /** 课程 id */
  cid: string;
  /** 课程名称 */
  name: string;
  /** 分数 */
  grade: number;
  /** 成绩代码 */
  gradeCode: string;
  /** 分数文本 */
  gradeText: string;
  gradeType: "百分制" | "五级制";
  /** 课程类型 */
  courseType: string;
  /** 课程类型短称 */
  shortCourseType: string;
  /** 学时 */
  hours: number | null;
  /** 学分 */
  point: number;
  /** 成绩标识 */
  mark: string;
  /** 开课单位 */
  office: string;
  /** 考试性质 */
  examType: "正常考试" | "校际交流" | "补考";
}

export interface UnderGradeListSuccessResponse {
  success: true;
  data: UnderStudyGradeResult[];
}

export type UnderGradeListResponse =
  | UnderGradeListSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse;

const QUERY_URL = `${UNDER_STUDY_SERVER}/new/student/xskccj/kccjDatas`;

const getGradeLists = (
  records: RawUnderGradeResultItem[],
): UnderStudyGradeResult[] =>
  records.map(
    ({
      xnxqmc,
      kcmc,
      kcdlmc,
      zcj,
      zcjfs,
      ksxzmc,
      cjfsmc,
      xf,
      zxs,
      xdfsmc,
      kkbmmc,
      cjdm,
      cjbzmc,
      kcptbh,
    }) => ({
      time: xnxqmc.replace(/^20/, "").replace(/季学期$/, ""),
      cid: kcptbh,
      name: kcmc,
      grade: zcjfs,
      gradeCode: cjdm,
      gradeText: zcj,
      gradeType: cjfsmc,
      courseType: kcdlmc,
      shortCourseType: xdfsmc,
      office: kkbmmc,
      hours: zxs,
      point: xf,
      examType: ksxzmc,
      mark: cjbzmc,
    }),
  );

const TEST_UNDER_GRADE_LIST_RESPONSE: UnderGradeListSuccessResponse = {
  success: true,
  data: Array(10)
    .fill(null)
    .map((_, i) => ({
      time: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
      cid: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}-1`,
      name: `测试课程${i + 1}`,
      grade: 100 - i * 2,
      gradeCode: "A",
      gradeText: "优秀",
      gradeType: "百分制",
      courseType: "必修",
      shortCourseType: "必",
      office: "测试单位",
      hours: 36,
      point: 2,
      examType: "正常考试",
      mark: "正常",
    })),
};

export const getUnderGradeList = async (
  cookieHeader: string,
  time: string,
): Promise<UnderGradeListResponse> => {
  const response = await fetch(QUERY_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${UNDER_STUDY_SERVER}/new/student/xskccj/kccjList.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      xnxqdm: time,
      source: "kccjlist",
      primarySort: "cjdm desc",
      page: "1",
      rows: "150",
      sort: "kcmc",
      order: "asc",
    }),
  });

  if (response.headers.get("Content-Type")?.includes("text/html"))
    return ExpiredResponse;

  const data = (await response.json()) as RawUnderGradeResult;

  if ("code" in data) {
    if (data.message === "尚未登录，请先登录") return ExpiredResponse;

    return UnknownResponse(data.message);
  }

  const gradeList = getGradeLists(data.rows);

  return {
    success: true,
    data: gradeList,
  };
};

export const underStudyGradeListHandler = request<
  UnderGradeListResponse,
  UnderGradeListOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST")) {
    return res.json(TEST_UNDER_GRADE_LIST_RESPONSE);
  }

  return res.json(await getUnderGradeList(cookieHeader, req.body.time ?? ""));
});
