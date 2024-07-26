import type { RequestHandler } from "express";

import { underStudyLogin } from "./login.js";
import { UNDER_STUDY_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import {
  ExpiredResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../utils/index.js";

interface RawUnderSpecialExamItem {
  /** 考试成绩 */
  zcj: number;
  /** 考试时间 */
  kssj: string;
  /** 修读学期 */
  xnxqmc: string;
  /** 考试名称 */
  kjkcmc: string;
  /** 考试成绩代码 */
  kjcjdm: string;

  /** 学院 */
  xsyxmc: string;
  /** 学制 */
  xz: number;
  /** 培养类别 */
  pyccmc: string;
  /** 专业名称 */
  zymc: string;
  /** 班级 */
  bjmc: string;
  /** 身份证号 */
  sfzh: string;

  kjkcbh: string;
  rownum_: number;
  zkzh: "";
  cjbzmc: "";
  xm1cj: "";
  xm2cj: "";
  xm3cj: "";
  xm4cj: "";
  xm5cj: "";
  djmc: "";
  bz: "";
}

interface RawUnderSpecialExamSuccessResult {
  data: "";
  rows: RawUnderSpecialExamItem[];
  total: number;
}

interface RawUnderSpecialExamFailedResult {
  code: number;
  data: string;
  message: string;
}

type RawUnderSpecialExamResult =
  | RawUnderSpecialExamSuccessResult
  | RawUnderSpecialExamFailedResult;

export interface UnderSpecialExamResult {
  /** 修复学期 */
  semester: string;
  /** 考试时间 */
  time: string;
  /** 考试名称 */
  name: string;
  /** 分数 */
  grade: number;
  /** 成绩代码 */
  gradeCode: string;
}

export type UnderSpecialExamSuccessResponse = CommonSuccessResponse<
  UnderSpecialExamResult[]
>;

export type UnderSpecialExamResponse =
  | UnderSpecialExamSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse;

const QUERY_URL = `${UNDER_STUDY_SERVER}/new/student/xskjcj/datas`;

const getSpecialExamResults = (
  records: RawUnderSpecialExamItem[],
): UnderSpecialExamResult[] =>
  records.map(({ zcj, kssj, xnxqmc, kjkcmc, kjcjdm }) => ({
    semester: xnxqmc.replace(/^20/, "").replace(/季学期$/, ""),
    time: kssj,
    name: kjkcmc,
    grade: zcj,
    gradeCode: kjcjdm,
  }));

const TEST_SPECIAL_EXAM_RESPONSE: UnderSpecialExamSuccessResponse = {
  success: true,
  data: Array<UnderSpecialExamResult>(4).fill({
    semester: "20-21学年第一学期",
    time: "2020-12-31",
    name: "测试考试",
    grade: 100,
    gradeCode: "100",
  }),
};

export const getUnderStudySpecialExam = async (
  cookieHeader: string,
): Promise<UnderSpecialExamResponse> => {
  const response = await fetch(QUERY_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${UNDER_STUDY_SERVER}/new/student/xskjcj/xskjcjlist.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      page: "1",
      rows: "50",
      sort: "xnxqdm",
      order: "asc",
    }),
  });

  if (response.headers.get("Content-Type")?.includes("text/html"))
    return ExpiredResponse;

  const data = (await response.json()) as RawUnderSpecialExamResult;

  if ("code" in data) {
    if (data.message === "尚未登录，请先登录") return ExpiredResponse;

    throw new Error(data.message);
  }

  const records = getSpecialExamResults(data.rows);

  return {
    success: true,
    data: records,
  };
};

export const underStudySpecialExamHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await underStudyLogin({ id, password, authToken });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(QUERY_URL);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const cookieHeader = req.headers.cookie;

    if (cookieHeader.includes("TEST"))
      return res.json(TEST_SPECIAL_EXAM_RESPONSE);

    return res.json(await getUnderStudySpecialExam(cookieHeader));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
