import type { RequestHandler } from "express";

import { underStudyLogin } from "./login.js";
import { UNDER_STUDY_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
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

export interface UnderSpecialExamSuccessResponse {
  success: true;
  data: UnderSpecialExamResult[];
}

export type UnderSpecialExamResponse =
  | UnderSpecialExamSuccessResponse
  | AuthLoginFailedResult
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
  Partial<LoginOptions>
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await underStudyLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(QUERY_URL);
    }

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

    const data = <RawUnderSpecialExamResult>await response.json();

    if ("code" in data) {
      if (data.message === "尚未登录，请先登录")
        return {
          success: false,
          type: LoginFailType.Expired,
          msg: "登录过期，请重新登录",
        };

      return {
        success: false,
        msg: data.message,
      };
    }

    const records = getSpecialExamResults(data.rows);

    return res.json(<UnderSpecialExamSuccessResponse>{
      success: true,
      data: records,
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
