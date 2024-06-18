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

export const underStudySpecialExamHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password } = req.body;

    if (id && password) {
      const result = await underStudyLogin({ id, password });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(QUERY_URL);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const response = await fetch(QUERY_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: req.headers.cookie,
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

    if (response.headers.get("content-type")?.includes("text/html"))
      return res.json(ExpiredResponse);

    const data = (await response.json()) as RawUnderSpecialExamResult;

    if ("code" in data) {
      if (data.message === "尚未登录，请先登录")
        return res.json(ExpiredResponse);

      throw new Error(data.message);
    }

    const records = getSpecialExamResults(data.rows);

    return res.json({
      success: true,
      data: records,
    } as UnderSpecialExamSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
